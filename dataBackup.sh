#!/bin/bash

# Backup script for JSON data files
BACKUP_DIR="data/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Backup data files
cp data/analytics.json "$BACKUP_DIR/analytics_$TIMESTAMP.json"
cp data/countries.json "$BACKUP_DIR/countries_$TIMESTAMP.json"
cp data/settings.json "$BACKUP_DIR/settings_$TIMESTAMP.json"

echo "Backup created: $TIMESTAMP"
echo "Files backed up:"
ls -la "$BACKUP_DIR" | grep "$TIMESTAMP"

# Keep only last 10 backups
cd "$BACKUP_DIR"
ls -t | tail -n +11 | xargs rm -f 2>/dev/null || true
cd - > /dev/null

echo "Cleanup: Keeping only last 10 backups"
