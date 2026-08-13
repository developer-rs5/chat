#!/bin/bash

# Restore script for JSON data files
BACKUP_DIR="data/backups"
TIMESTAMP=${1:-$(ls -t "$BACKUP_DIR" | head -1)}

if [ -z "$TIMESTAMP" ]; then
    echo "No backup found. Available backups:"
    ls -la "$BACKUP_DIR"
    exit 1
fi

RESTORE_FILE="$BACKUP_DIR/analytics_$TIMESTAMP.json"
COUNTRIES_FILE="$BACKUP_DIR/countries_$TIMESTAMP.json"
SETTINGS_FILE="$BACKUP_DIR/settings_$TIMESTAMP.json"

if [ ! -f "$RESTORE_FILE" ]; then
    echo "Backup not found: $TIMESTAMP"
    echo "Available backups:"
    ls -la "$BACKUP_DIR"
    exit 1
fi

# Create backup of current data before restore
cp data/analytics.json "data/analytics_before_restore.json"
cp data/countries.json "data/countries_before_restore.json"
cp data/settings.json "data/settings_before_restore.json"

# Restore files
cp "$RESTORE_FILE" data/analytics.json
cp "$COUNTRIES_FILE" data/countries.json
cp "$SETTINGS_FILE" data/settings.json

echo "Data restored from backup: $TIMESTAMP"
echo "Current data files:"
ls -la data/*.json