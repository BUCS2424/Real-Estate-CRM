# Database connection module
import os
from motor.motor_asyncio import AsyncIOMotorClient

MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'fusion_crm')

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

def get_db():
    return db

def close_db():
    client.close()
