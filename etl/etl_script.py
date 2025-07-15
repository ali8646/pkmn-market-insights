#!/usr/bin/env python3

import requests
import pandas as pd
import psycopg2
from psycopg2.extras import execute_batch
import io
import logging
from datetime import datetime
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler("daily_update.log"),
        logging.StreamHandler()
    ]
)

# Database connection parameters
DB_PARAMS = {
    "host": os.getenv("DB_HOST", "localhost"),
    "database": os.getenv("DB_NAME", "pokemon_tcg"),
    "user": os.getenv("DB_USER", "postgres"),
    "password": os.getenv("DB_PASSWORD", ""),
    "port": os.getenv("DB_PORT", "5432")
}

# API configuration
CATEGORY_ID = 3  # Pokémon
BASE_URL = "https://tcgcsv.com/tcgplayer"
GROUPS_URL = f"{BASE_URL}/{CATEGORY_ID}/groups"
PRODUCTS_URL_TEMPLATE = f"{BASE_URL}/{CATEGORY_ID}/{{group_id}}/ProductsAndPrices.csv"

def get_db_connection():
    """Establish a connection to the Postgres database"""
    try:
        conn = psycopg2.connect(**DB_PARAMS)
        logging.info("Database connection established successfully")
        return conn
    except Exception as e:
        logging.error(f"Error connecting to database: {e}")
        raise

def fetch_groups():
    """Fetch all groups (sets) for Pokémon"""
    try:
        logging.info(f"Fetching groups from {GROUPS_URL}")
        response = requests.get(GROUPS_URL, timeout=30)
        response.raise_for_status()
        groups_data = response.json()
        
        groups = []
        for group in groups_data.get("results", []):
            groups.append({
                "groupId": group.get("groupId"),
                "groupName": group.get("name"),
                "modifiedOn": group.get("modifiedOn", datetime.now().isoformat())
            })
        
        logging.info(f"Successfully fetched {len(groups)} groups")
        return groups
    except Exception as e:
        logging.error(f"Error fetching groups: {e}")
        return []

def fetch_products_for_group(group_id):
    """Fetch all products (cards) for a specific group"""
    url = PRODUCTS_URL_TEMPLATE.format(group_id=group_id)
    try:
        logging.info(f"Fetching products for group {group_id} from {url}")
        response = requests.get(url, timeout=30)
        response.raise_for_status()
        
        df = pd.read_csv(io.StringIO(response.text))
        logging.info(f"Successfully fetched {len(df)} products for group {group_id}")
        return df
    except Exception as e:
        logging.error(f"Error fetching products for group {group_id}: {e}")
        return pd.DataFrame()

def update_groups(conn, groups):
    """Update the groups table with current data"""
    if not groups:
        logging.warning("No groups to update")
        return
        
    cursor = conn.cursor()
    try:
        values = [(
            group["groupId"], 
            group["groupName"], 
            CATEGORY_ID,
            datetime.now()
        ) for group in groups]
        
        query = """
            INSERT INTO groups (group_id, group_name, category_id, modified_on)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT (group_id) DO UPDATE SET
                group_name = EXCLUDED.group_name,
                modified_on = EXCLUDED.modified_on
        """
        
        execute_batch(cursor, query, values)
        conn.commit()
        logging.info(f"Successfully updated {len(values)} groups")
    except Exception as e:
        conn.rollback()
        logging.error(f"Error updating groups: {e}")
    finally:
        cursor.close()

def update_products_and_prices(conn, df, group_id):
    """Update products table and insert today's prices into price_history"""
    if df.empty:
        logging.warning(f"No data to update for group {group_id}")
        return
    
    cursor = conn.cursor()
    try:
        product_values = []
        price_values = []
        
        now = datetime.now()
        
        for _, row in df.iterrows():
            try:
                product_id = int(row['productId'])
                sub_type_name = row.get('subTypeName', '')
                
                # Prepare data for products table
                product_values.append((
                    product_id, CATEGORY_ID, group_id,
                    row.get('name', ''), row.get('cleanName', ''),
                    row.get('url', ''), row.get('imageUrl', ''),
                    int(row.get('imageCount', 0) or 0),
                    sub_type_name, now,
                    row.get('extCardType', ''), row.get('extHP', ''),
                    row.get('extNumber', ''), row.get('extRarity', ''),
                    row.get('extResistance', ''), row.get('extRetreatCost', ''),
                    row.get('extStage', ''), row.get('extUPC', ''),
                    row.get('extWeakness', ''), row.get('extCardText', ''),
                    row.get('extAttack1', ''), row.get('extAttack2', ''),
                    row.get('extAttack3', ''), row.get('extAttack4', '')
                ))
                
                # Prepare data for price_history table
                market_price = float(row['marketPrice']) if pd.notna(row['marketPrice']) else None
                direct_low = float(row['directLowPrice']) if pd.notna(row['directLowPrice']) else None
                low_price = float(row['lowPrice']) if pd.notna(row['lowPrice']) else None
                mid_price = float(row['midPrice']) if pd.notna(row['midPrice']) else None
                high_price = float(row['highPrice']) if pd.notna(row['highPrice']) else None
                
                if any(p is not None for p in [market_price, direct_low, low_price, mid_price, high_price]):
                    price_values.append((
                        product_id, group_id, sub_type_name,
                        now.date(), 'daily', None,
                        None, None, # open_price and close_price are NULL for daily
                        low_price, high_price, mid_price,
                        market_price, direct_low, None # volume
                    ))
            except (ValueError, TypeError) as e:
                logging.error(f"Error processing row for product ID {row.get('productId')}: {e}, skipping")
                continue
        
        # Update products table
        if product_values:
            products_query = """
                INSERT INTO products (
                    product_id, category_id, group_id, name, clean_name, 
                    url, image_url, image_count, sub_type_name, modified_on,
                    ext_card_type, ext_hp, ext_number, ext_rarity, ext_resistance,
                    ext_retreat_cost, ext_stage, ext_upc, ext_weakness, ext_card_text,
                    ext_attack1, ext_attack2, ext_attack3, ext_attack4
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (product_id) DO UPDATE SET
                    name = EXCLUDED.name, clean_name = EXCLUDED.clean_name,
                    url = EXCLUDED.url, image_url = EXCLUDED.image_url,
                    image_count = EXCLUDED.image_count, sub_type_name = EXCLUDED.sub_type_name,
                    modified_on = EXCLUDED.modified_on, ext_card_type = EXCLUDED.ext_card_type,
                    ext_hp = EXCLUDED.ext_hp, ext_number = EXCLUDED.ext_number,
                    ext_rarity = EXCLUDED.ext_rarity, ext_resistance = EXCLUDED.ext_resistance,
                    ext_retreat_cost = EXCLUDED.ext_retreat_cost, ext_stage = EXCLUDED.ext_stage,
                    ext_upc = EXCLUDED.ext_upc, ext_weakness = EXCLUDED.ext_weakness,
                    ext_card_text = EXCLUDED.ext_card_text, ext_attack1 = EXCLUDED.ext_attack1,
                    ext_attack2 = EXCLUDED.ext_attack2, ext_attack3 = EXCLUDED.ext_attack3,
                    ext_attack4 = EXCLUDED.ext_attack4;
            """
            execute_batch(cursor, products_query, product_values)
        
        # Insert today's prices into price_history
        if price_values:
            price_query = """
                INSERT INTO price_history (
                    product_id, group_id, sub_type_name, date_point, period_type, end_date,
                    open_price, close_price, low_price, high_price, mid_price,
                    market_price, direct_low_price, volume
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT DO NOTHING;
            """
            execute_batch(cursor, price_query, price_values)
        
        conn.commit()
        logging.info(f"Successfully updated {len(product_values)} products and inserted {len(price_values)} price records for group {group_id}")
    except Exception as e:
        conn.rollback()
        logging.error(f"Error updating data for group {group_id}: {e}")
    finally:
        cursor.close()

def main():
    """Main daily ETL function"""
    logging.info("Starting daily update ETL process")
    start_time = datetime.now()
    
    try:
        conn = get_db_connection()
        groups = fetch_groups()
        
        if not groups:
            logging.error("No groups fetched. Check the API or network connection.")
            return
            
        update_groups(conn, groups)
        
        total_groups = len(groups)
        for i, group in enumerate(groups):
            group_id = group["groupId"]
            logging.info(f"Processing group {i+1}/{total_groups}: {group['groupName']} ({group_id})")
            
            df = fetch_products_for_group(group_id)
            if not df.empty:
                update_products_and_prices(conn, df, group_id)
        
        conn.close()
        
        end_time = datetime.now()
        duration = (end_time - start_time).total_seconds() / 60.0
        logging.info(f"Daily update ETL process completed in {duration:.2f} minutes")
        
    except Exception as e:
        logging.error(f"Daily update ETL process failed: {e}")

if __name__ == "__main__":
    main()