import psycopg2
import os
from dotenv import load_dotenv
import sys

# Load environment variables from .env file
load_dotenv()

# Database connection parameters
DB_PARAMS = {
    "host": os.getenv("DB_HOST", "localhost"),
    "database": os.getenv("DB_NAME", "pokemon_tcg"),
    "user": os.getenv("DB_USER", "postgres"),
    "password": os.getenv("DB_PASSWORD", ""),
    "port": os.getenv("DB_PORT", "5432")
}

def test_connection():
    """Test the database connection and display useful information"""
    print("\n===== DATABASE CONNECTION TEST =====\n")
    
    # Print connection parameters (hiding password)
    safe_params = DB_PARAMS.copy()
    if safe_params["password"]:
        safe_params["password"] = "********"
    print(f"Connection parameters: {safe_params}")
    
    try:
        # Attempt to connect
        print("\nAttempting to connect to database...")
        conn = psycopg2.connect(**DB_PARAMS)
        
        # Create a cursor
        cursor = conn.cursor()
        
        print("✅ Connection successful!")
        
        # Get database version
        cursor.execute("SELECT version();")
        version = cursor.fetchone()[0]
        print(f"\nDatabase version: {version}")
        
        # List all tables
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name;
        """)
        
        tables = cursor.fetchall()
        
        if tables:
            print(f"\nFound {len(tables)} tables in database:")
            for table in tables:
                print(f"  - {table[0]}")
                
                # Get table row count
                cursor.execute(f"SELECT COUNT(*) FROM {table[0]};")
                row_count = cursor.fetchone()[0]
                print(f"    • {row_count} rows")
                
                # Get column information
                cursor.execute(f"""
                    SELECT column_name, data_type 
                    FROM information_schema.columns 
                    WHERE table_name = '{table[0]}' 
                    ORDER BY ordinal_position;
                """)
                columns = cursor.fetchall()
                
                if len(columns) > 0:
                    print(f"    • Columns: {', '.join([col[0] for col in columns[:3]])}" + 
                          (f"... and {len(columns)-3} more" if len(columns) > 3 else ""))
        else:
            print("\nNo tables found in database.")
            
        # Close connection
        cursor.close()
        conn.close()
        print("\n===== TEST COMPLETED SUCCESSFULLY =====")
        return True
        
    except Exception as e:
        print(f"\n❌ ERROR: Connection failed!")
        print(f"Error details: {e}")
        
        # More helpful troubleshooting based on common error types
        if "connection refused" in str(e).lower():
            print("\nPossible solutions:")
            print("1. Check if PostgreSQL server is running")
            print("2. Verify host and port are correct")
            print("3. Check if firewall is blocking connections")
        
        elif "password authentication failed" in str(e).lower():
            print("\nPossible solutions:")
            print("1. Check your username and password")
            print("2. Verify user has proper permissions")
            
        elif "database" in str(e).lower() and "does not exist" in str(e).lower():
            print("\nPossible solutions:")
            print("1. Create the database in pgAdmin 4")
            print("2. Check if you're using the correct database name")
        
        print("\n===== TEST FAILED =====")
        return False

if __name__ == "__main__":
    successful = test_connection()
    sys.exit(0 if successful else 1)