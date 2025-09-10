from pymongo import MongoClient
from config import Config
import logging

class Database:
    _instance = None
    _client = None
    _db = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(Database, cls).__new__(cls)
        return cls._instance
    
    def connect(self):
        try:
            if self._client is None:
                self._client = MongoClient(Config.MONGODB_URI)
                self._db = self._client[Config.DATABASE_NAME]
                # 연결 테스트
                self._client.admin.command('ping')
                logging.info("MongoDB 연결 성공")
            return self._db
        except Exception as e:
            logging.error(f"MongoDB 연결 실패: {e}")
            raise e
    
    def get_collection(self, collection_name):
        if self._db is None:
            self.connect()
        return self._db[collection_name]
    
    def close(self):
        if self._client:
            self._client.close()
            self._client = None
            self._db = None
            logging.info("MongoDB 연결 종료")

# 데이터베이스 인스턴스
db_instance = Database()

def get_db():
    return db_instance.connect()

def get_collection(collection_name):
    return db_instance.get_collection(collection_name)
