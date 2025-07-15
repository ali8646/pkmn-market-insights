#!/usr/bin/env python3

import psycopg2
from psycopg2.extras import execute_batch
import logging
from datetime import datetime, date, timedelta
import os
import time
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler("price_change_calculator.log"),
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

def get_db_connection():
    """Establish a connection to the Postgres database with timeout"""
    try:
        conn = psycopg2.connect(**DB_PARAMS)
        conn.set_session(autocommit=False)
        # Set statement timeout to 60 seconds to prevent queries from hanging
        cursor = conn.cursor()
        cursor.execute("SET statement_timeout = 60000")  # 60 seconds in milliseconds
        cursor.close()
        logging.info("Database connection established successfully")
        return conn
    except Exception as e:
        logging.error(f"Error connecting to database: {e}")
        raise

def calculate_percent_change(old_price, new_price):
    """Calculate percent change between two prices"""
    if old_price is None or new_price is None or old_price == 0:
        return None
    return round(((new_price - old_price) / old_price) * 100, 2)

def calculate_dollar_change(old_price, new_price):
    """Calculate dollar change between two prices"""
    if old_price is None or new_price is None:
        return None
    return round(new_price - old_price, 2)

def get_products_batch(conn, offset, batch_size):
    """Get a batch of products from the database"""
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT product_id, sub_type_name
            FROM products
            ORDER BY product_id
            LIMIT %s OFFSET %s
        """, (batch_size, offset))
        return cursor.fetchall()
    except Exception as e:
        logging.error(f"Error getting products batch at offset {offset}: {e}")
        return []
    finally:
        cursor.close()

def count_products(conn):
    """Count total number of products"""
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT COUNT(*) FROM products")
        return cursor.fetchone()[0]
    except Exception as e:
        logging.error(f"Error counting products: {e}")
        return 0
    finally:
        cursor.close()

def get_price_data_for_batch(conn, product_ids, today):
    """Get all required price data for a batch of products in a single query"""
    if not product_ids:
        return {}
        
    # Calculate target dates for each timeframe
    seven_days_ago = today - timedelta(days=7)
    thirty_days_ago = today - timedelta(days=30)
    six_months_ago = today - timedelta(days=180)
    ytd_start = date(today.year, 1, 1)
    one_year_ago = today - timedelta(days=365)
    
    cursor = conn.cursor()
    price_data = {}
    
    try:
        # Get current prices
        placeholders = ','.join(['%s'] * len(product_ids))
        cursor.execute(f"""
            WITH latest_prices AS (
                SELECT DISTINCT ON (product_id, sub_type_name) 
                    product_id, sub_type_name, market_price, date_point
                FROM price_history
                WHERE product_id IN ({placeholders})
                  AND market_price IS NOT NULL
                ORDER BY product_id, sub_type_name, date_point DESC
            )
            SELECT product_id, sub_type_name, market_price, date_point
            FROM latest_prices
        """, product_ids)
        
        for row in cursor.fetchall():
            product_id, sub_type, price, price_date = row
            if product_id not in price_data:
                price_data[product_id] = {'sub_type_name': sub_type, 'timeframes': {}}
            price_data[product_id]['current'] = {'price': price, 'date': price_date}
        
        # Define timeframes to query
        timeframes = [
            ('7d', seven_days_ago),
            ('30d', thirty_days_ago),
            ('6m', six_months_ago),
            ('ytd', ytd_start),
            ('1y', one_year_ago)
        ]
        
        # Get historical prices for each timeframe
        for timeframe_name, target_date in timeframes:
            cursor.execute(f"""
                WITH historical_prices AS (
                    SELECT 
                        product_id, sub_type_name,
                        market_price, date_point,
                        ROW_NUMBER() OVER (
                            PARTITION BY product_id, sub_type_name 
                            ORDER BY ABS(date_point - %s)
                        ) as rn
                    FROM price_history
                    WHERE product_id IN ({placeholders})
                      AND date_point <= %s
                      AND market_price IS NOT NULL
                )
                SELECT product_id, sub_type_name, market_price, date_point
                FROM historical_prices
                WHERE rn = 1
            """, [target_date] + list(product_ids) + [target_date])
            
            for row in cursor.fetchall():
                product_id, sub_type, price, price_date = row
                if product_id in price_data:
                    price_data[product_id]['timeframes'][timeframe_name] = {'price': price, 'date': price_date}
        
        # Get oldest prices (for all-time comparison)
        cursor.execute(f"""
            WITH oldest_prices AS (
                SELECT DISTINCT ON (product_id, sub_type_name) 
                    product_id, sub_type_name, market_price, date_point
                FROM price_history
                WHERE product_id IN ({placeholders})
                  AND market_price IS NOT NULL
                ORDER BY product_id, sub_type_name, date_point ASC
            )
            SELECT product_id, sub_type_name, market_price, date_point
            FROM oldest_prices
        """, product_ids)
        
        for row in cursor.fetchall():
            product_id, sub_type, price, price_date = row
            if product_id in price_data:
                price_data[product_id]['timeframes']['all'] = {'price': price, 'date': price_date}
                
        return price_data
    except Exception as e:
        logging.error(f"Error getting price data for batch: {e}")
        return {}
    finally:
        cursor.close()

def update_price_changes_batch(conn, price_data_batch):
    """Update price changes for a batch of products"""
    if not price_data_batch:
        return 0
        
    values = []
    
    for product_id, data in price_data_batch.items():
        sub_type_name = data.get('sub_type_name', '')
        current = data.get('current', {'price': None, 'date': None})
        timeframes = data.get('timeframes', {})
        
        if current.get('price') is None:
            continue  # Skip products without current price
            
        # Get timeframe data
        price_7d = timeframes.get('7d', {'price': None, 'date': None})
        price_30d = timeframes.get('30d', {'price': None, 'date': None})
        price_6m = timeframes.get('6m', {'price': None, 'date': None})
        price_ytd = timeframes.get('ytd', {'price': None, 'date': None})
        price_1y = timeframes.get('1y', {'price': None, 'date': None})
        price_all = timeframes.get('all', {'price': None, 'date': None})
        
        # Calculate changes
        change_7d_pct = calculate_percent_change(price_7d.get('price'), current.get('price'))
        change_7d_dollar = calculate_dollar_change(price_7d.get('price'), current.get('price'))
        
        change_30d_pct = calculate_percent_change(price_30d.get('price'), current.get('price'))
        change_30d_dollar = calculate_dollar_change(price_30d.get('price'), current.get('price'))
        
        change_6m_pct = calculate_percent_change(price_6m.get('price'), current.get('price'))
        change_6m_dollar = calculate_dollar_change(price_6m.get('price'), current.get('price'))
        
        change_ytd_pct = calculate_percent_change(price_ytd.get('price'), current.get('price'))
        change_ytd_dollar = calculate_dollar_change(price_ytd.get('price'), current.get('price'))
        
        change_1y_pct = calculate_percent_change(price_1y.get('price'), current.get('price'))
        change_1y_dollar = calculate_dollar_change(price_1y.get('price'), current.get('price'))
        
        change_all_pct = calculate_percent_change(price_all.get('price'), current.get('price'))
        change_all_dollar = calculate_dollar_change(price_all.get('price'), current.get('price'))
        
        values.append((
            product_id, sub_type_name,
            current.get('price'), current.get('date'),
            
            price_7d.get('price'), price_7d.get('date'), 
            change_7d_pct, change_7d_dollar,
            
            price_30d.get('price'), price_30d.get('date'),
            change_30d_pct, change_30d_dollar,
            
            price_6m.get('price'), price_6m.get('date'),
            change_6m_pct, change_6m_dollar,
            
            price_ytd.get('price'), price_ytd.get('date'),
            change_ytd_pct, change_ytd_dollar,
            
            price_1y.get('price'), price_1y.get('date'),
            change_1y_pct, change_1y_dollar,
            
            price_all.get('price'), price_all.get('date'),
            change_all_pct, change_all_dollar,
            
            datetime.now()
        ))
    
    if not values:
        return 0
        
    # Update the price_change table
    cursor = conn.cursor()
    try:
        # Ensure the unique constraint exists
        try:
            cursor.execute("""
                SELECT constraint_name
                FROM information_schema.table_constraints 
                WHERE table_name = 'price_change' 
                  AND constraint_type = 'UNIQUE'
                  AND constraint_name = 'price_change_product_id_key'
            """)
            if not cursor.fetchone():
                cursor.execute("ALTER TABLE price_change ADD CONSTRAINT price_change_product_id_key UNIQUE (product_id)")
                conn.commit()
        except Exception as e:
            conn.rollback()
            logging.warning(f"Error checking/creating constraint: {e}")
        
        # Perform the upsert
        query = """
            INSERT INTO price_change (
                product_id, sub_type_name, 
                current_price, current_price_date,
                
                price_7d, price_7d_date, 
                change_7d_pct, change_7d_dollar,
                
                price_30d, price_30d_date,
                change_30d_pct, change_30d_dollar,
                
                price_6m, price_6m_date,
                change_6m_pct, change_6m_dollar,
                
                price_ytd, price_ytd_date,
                change_ytd_pct, change_ytd_dollar,
                
                price_1y, price_1y_date,
                change_1y_pct, change_1y_dollar,
                
                price_all, price_all_date,
                change_all_pct, change_all_dollar,
                
                last_updated
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (product_id) DO UPDATE SET
                sub_type_name = EXCLUDED.sub_type_name,
                current_price = EXCLUDED.current_price,
                current_price_date = EXCLUDED.current_price_date,
                
                price_7d = EXCLUDED.price_7d,
                price_7d_date = EXCLUDED.price_7d_date,
                change_7d_pct = EXCLUDED.change_7d_pct,
                change_7d_dollar = EXCLUDED.change_7d_dollar,
                
                price_30d = EXCLUDED.price_30d,
                price_30d_date = EXCLUDED.price_30d_date,
                change_30d_pct = EXCLUDED.change_30d_pct,
                change_30d_dollar = EXCLUDED.change_30d_dollar,
                
                price_6m = EXCLUDED.price_6m,
                price_6m_date = EXCLUDED.price_6m_date,
                change_6m_pct = EXCLUDED.change_6m_pct,
                change_6m_dollar = EXCLUDED.change_6m_dollar,
                
                price_ytd = EXCLUDED.price_ytd,
                price_ytd_date = EXCLUDED.price_ytd_date,
                change_ytd_pct = EXCLUDED.change_ytd_pct,
                change_ytd_dollar = EXCLUDED.change_ytd_dollar,
                
                price_1y = EXCLUDED.price_1y,
                price_1y_date = EXCLUDED.price_1y_date,
                change_1y_pct = EXCLUDED.change_1y_pct,
                change_1y_dollar = EXCLUDED.change_1y_dollar,
                
                price_all = EXCLUDED.price_all,
                price_all_date = EXCLUDED.price_all_date,
                change_all_pct = EXCLUDED.change_all_pct,
                change_all_dollar = EXCLUDED.change_all_dollar,
                
                last_updated = EXCLUDED.last_updated
        """
        
        execute_batch(cursor, query, values, page_size=100)
        conn.commit()
        return len(values)
    except Exception as e:
        conn.rollback()
        logging.error(f"Error updating price changes batch: {e}")
        return 0
    finally:
        cursor.close()

def main():
    """Main function with batching"""
    logging.info("Starting price change calculation with improved batching")
    start_time = datetime.now()
    overall_start = time.time()
    
    try:
        conn = get_db_connection()
        
        # Get total product count
        total_products = count_products(conn)
        logging.info(f"Found {total_products} total products to process")
        
        batch_size = 500  # Process 500 products at a time
        total_processed = 0
        today = date.today()
        
        # Process in batches
        for offset in range(0, total_products, batch_size):
            batch_start = time.time()
            logging.info(f"Processing batch at offset {offset}/{total_products} ({offset/total_products*100:.1f}%)")
            
            # Get batch of products
            products_batch = get_products_batch(conn, offset, batch_size)
            if not products_batch:
                logging.warning(f"No products found in batch at offset {offset}, skipping")
                continue
                
            # Extract product IDs for this batch
            product_ids = [p[0] for p in products_batch]
            
            # Get price data for all products in this batch (in one efficient query)
            price_data = get_price_data_for_batch(conn, product_ids, today)
            
            # Update price changes for this batch
            updated = update_price_changes_batch(conn, price_data)
            total_processed += updated
            
            batch_end = time.time()
            batch_duration = batch_end - batch_start
            logging.info(f"Batch completed: processed {updated} products in {batch_duration:.2f} seconds")
            
            # Optional: add a small delay between batches to reduce database load
            time.sleep(0.5)
        
        conn.close()
        
        overall_end = time.time()
        overall_duration = overall_end - overall_start
        end_time = datetime.now()
        duration_minutes = (end_time - start_time).total_seconds() / 60.0
        
        logging.info(f"Price change calculation completed in {duration_minutes:.2f} minutes")
        logging.info(f"Total processing time: {overall_duration:.2f} seconds, processed {total_processed} products")
        
    except Exception as e:
        logging.error(f"Price change calculation failed: {e}")
        
if __name__ == "__main__":
    main()