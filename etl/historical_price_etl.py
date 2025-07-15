#!/usr/bin/env python3

import os
import tempfile
import shutil
import json
import requests
import py7zr
import psycopg2
from psycopg2.extras import execute_batch
from datetime import datetime, date, timedelta
from dotenv import load_dotenv
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler("historical_etl.log"),
        logging.StreamHandler()
    ]
)

# Load environment variables
load_dotenv()

# Database connection parameters
DB_PARAMS = {
    "host": os.getenv("DB_HOST", "localhost"),
    "database": os.getenv("DB_NAME", "pokemon_tcg"),
    "user": os.getenv("DB_USER", "postgres"),
    "password": os.getenv("DB_PASSWORD", ""),
    "port": os.getenv("DB_PORT", "5432")
}

# Constants
CATEGORY_ID = 3  # Pokémon
TEMP_DIR = "./temp_archives"
ARCHIVE_BASE_URL = "https://tcgcsv.com/archive/tcgplayer"

# Create temp directory if it doesn't exist
os.makedirs(TEMP_DIR, exist_ok=True)

def daterange_end_inclusive(start_date, end_date):
    """Generate a range of dates, inclusive of end date"""
    days = int((end_date - start_date).days) + 1
    for n in range(days):
        yield start_date + timedelta(n)

def get_latest_date():
    """Get the latest date from tcgcsv.com"""
    try:
        response = requests.get("https://tcgcsv.com/last-updated.txt", timeout=10)
        response.raise_for_status()
        date_str = response.text.strip()
        return datetime.fromisoformat(date_str).date()
    except Exception as e:
        logging.error(f"Error getting latest date: {e}")
        # Default to today if we can't get the date
        return date.today()

def download_and_extract_archive(date_str):
    """Download and extract 7z archive for a specific date"""
    archive_url = f"{ARCHIVE_BASE_URL}/prices-{date_str}.ppmd.7z"
    archive_path = os.path.join(TEMP_DIR, f"prices-{date_str}.ppmd.7z")
    extract_path = os.path.join(TEMP_DIR, f"prices-{date_str}")
    
    try:
        logging.info(f"Downloading archive for {date_str} from {archive_url}")
        response = requests.get(archive_url, stream=True, timeout=60)
        response.raise_for_status()
        
        with open(archive_path, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
        
        logging.info(f"Extracting archive for {date_str}")
        with py7zr.SevenZipFile(archive_path, mode='r') as archive:
            archive.extractall(path=extract_path)
        
        # Return path to category 3 directory
        category_path = os.path.join(extract_path, date_str, str(CATEGORY_ID))
        return category_path
    except Exception as e:
        logging.error(f"Error downloading/extracting archive for {date_str}: {e}")
        return None
    finally:
        # Clean up the downloaded archive
        if os.path.exists(archive_path):
            os.remove(archive_path)

def get_existing_product_ids(conn):
    """Get a set of all product IDs that exist in the products table"""
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT product_id FROM products")
        product_ids = {row[0] for row in cursor.fetchall()}
        logging.info(f"Found {len(product_ids)} existing products in database")
        return product_ids
    except Exception as e:
        logging.error(f"Error getting existing product IDs: {e}")
        return set()
    finally:
        cursor.close()

def process_group_prices(category_path, group_id, date_val, existing_product_ids):
    """Process price data for a specific group"""
    prices_path = os.path.join(category_path, str(group_id), "prices")
    
    if not os.path.exists(prices_path):
        return []
    
    try:
        with open(prices_path, 'r') as f:
            prices_data = json.load(f)
        
        if not prices_data.get("success", False):
            logging.warning(f"Price data for group {group_id} on {date_val} indicates failure")
            return []
        
        results = []
        skipped_count = 0
        for price in prices_data.get("results", []):
            # Extract relevant data
            try:
                product_id = int(price.get("productId"))
            except (TypeError, ValueError):
                continue
                
            # Skip products not in our database
            if product_id not in existing_product_ids:
                skipped_count += 1
                continue
                
            sub_type = price.get("subTypeName", "")
            
            # Use values directly from the JSON
            market_price = price.get("marketPrice")
            direct_low = price.get("directLowPrice")
            low_price = price.get("lowPrice")
            mid_price = price.get("midPrice") 
            high_price = price.get("highPrice")
            
            # Skip if no useful price data
            if all(p is None for p in [market_price, low_price, mid_price, high_price]):
                continue
                
            results.append({
                "product_id": product_id,
                "group_id": group_id,
                "sub_type_name": sub_type,
                "date": date_val,
                "market_price": market_price,
                "direct_low_price": direct_low,
                "low_price": low_price,
                "mid_price": mid_price,
                "high_price": high_price
            })
        
        if skipped_count > 0 and skipped_count > len(results):
            logging.info(f"Skipped {skipped_count} products not in database for group {group_id} on {date_val}")
            
        return results
    except Exception as e:
        logging.error(f"Error processing price data for group {group_id} on {date_val}: {e}")
        return []

def get_all_group_ids(conn):
    """Get all group IDs from the database"""
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT group_id FROM groups")
        return [row[0] for row in cursor.fetchall()]
    except Exception as e:
        logging.error(f"Error getting group IDs: {e}")
        return []
    finally:
        cursor.close()

def insert_daily_prices(conn, prices):
    """Insert daily price records into the database"""
    if not prices:
        return 0
    
    cursor = conn.cursor()
    try:
        values = []
        for price in prices:
            values.append((
                price["product_id"],
                price["group_id"],
                price["sub_type_name"],
                price["date"],
                'daily',  # period_type
                None,     # end_date (NULL for daily records)
                None,     # open_price (NULL for daily as requested)
                None,     # close_price (NULL for daily as requested)
                price["low_price"],   # Direct from JSON
                price["high_price"],  # Direct from JSON
                price["mid_price"],   # Direct from JSON
                price["market_price"],
                price["direct_low_price"],
                None  # volume (we don't have this information)
            ))
        
        query = """
            INSERT INTO price_history (
                product_id, group_id, sub_type_name, date_point, period_type, end_date,
                open_price, close_price, low_price, high_price, mid_price,
                market_price, direct_low_price, volume
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT DO NOTHING
        """
        
        execute_batch(cursor, query, values)
        conn.commit()
        return len(values)
    except Exception as e:
        conn.rollback()
        logging.error(f"Error inserting daily prices: {e}")
        return 0
    finally:
        cursor.close()

def cleanup():
    """Clean up temporary files"""
    try:
        shutil.rmtree(TEMP_DIR)
        logging.info(f"Cleaned up temporary directory {TEMP_DIR}")
    except Exception as e:
        logging.error(f"Error cleaning up: {e}")

def main():
    """Main ETL process for historical price data"""
    logging.info("Starting historical price ETL process")
    start_time = datetime.now()
    
    try:
        # Define date range
        start_date = date(2024, 2, 8)  # Historical start date
        end_date = get_latest_date()   # Latest date available
        
        logging.info(f"Processing price data from {start_date} to {end_date}")
        
        # Connect to database
        conn = psycopg2.connect(**DB_PARAMS)
        
        # Get all group IDs
        group_ids = get_all_group_ids(conn)
        if not group_ids:
            logging.error("No groups found in database. Please run the main ETL script first.")
            return
            
        # Get existing product IDs to filter out non-existent products
        existing_product_ids = get_existing_product_ids(conn)
        if not existing_product_ids:
            logging.error("No products found in database. Please run the main ETL script first.")
            return
        
        # Process all dates - no limits in production version
        total_records = 0
        total_days = (end_date - start_date).days + 1
        
        for i, single_date in enumerate(daterange_end_inclusive(start_date, end_date)):
            date_str = single_date.strftime('%Y-%m-%d')
            
            # Progress reporting
            progress = (i + 1) / total_days * 100
            logging.info(f"Processing date: {date_str} ({i+1}/{total_days}, {progress:.1f}%)")
            
            # Download and extract archive
            category_path = download_and_extract_archive(date_str)
            if not category_path:
                logging.warning(f"Skipping date {date_str} - could not download or extract archive")
                continue
            
            # Process each group - using batch processing to conserve memory
            batch_size = 20
            group_batches = [group_ids[j:j + batch_size] for j in range(0, len(group_ids), batch_size)]
            
            for batch_idx, group_batch in enumerate(group_batches):
                all_prices = []
                for group_id in group_batch:
                    group_prices = process_group_prices(category_path, group_id, single_date, existing_product_ids)
                    all_prices.extend(group_prices)
                
                # Insert daily prices
                records_inserted = insert_daily_prices(conn, all_prices)
                total_records += records_inserted
                
                if records_inserted > 0:
                    logging.info(f"Batch {batch_idx+1}/{len(group_batches)}: Inserted {records_inserted} price records")
            
            # Clean up extracted files for this date
            shutil.rmtree(os.path.join(TEMP_DIR, f"prices-{date_str}"), ignore_errors=True)
            
            # Report total progress periodically
            if (i + 1) % 10 == 0 or i == total_days - 1:
                logging.info(f"Total progress: {progress:.1f}% - Processed {total_records} records so far")
        
        # Close database connection
        conn.close()
        
        # Final cleanup
        cleanup()
        
        end_time = datetime.now()
        duration = (end_time - start_time).total_seconds() / 60.0  # in minutes
        logging.info(f"Historical price ETL process completed in {duration:.2f} minutes. Total records: {total_records}")
        
    except Exception as e:
        logging.error(f"Historical price ETL process failed: {e}")

if __name__ == "__main__":
    main()