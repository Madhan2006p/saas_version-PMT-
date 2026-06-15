#!/usr/bin/env bash
set -o errexit

pip install -r requirements.txt
python manage.py collectstatic --no-input

# Delete all old migrations to prevent SQLite recreation errors
find . -path "*/migrations/*.py" -not -name "__init__.py" -delete
find . -path "*/migrations/*.pyc" -delete

# Create fresh migrations
python manage.py makemigrations

# Migrate and seed
python manage.py migrate
python manage.py seed_demo_data --skip-keycloak --skip-permissions
