#!/bin/bash

# Create a crontab entry to run the ETL script daily at 3:00 AM
(crontab -l 2>/dev/null; echo "0 3 * * * cd $(pwd) && python3 etl_script.py") | crontab -

echo "Cron job set to run daily at 3:00 AM"