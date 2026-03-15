from utils.db import get_collection
from bson.objectid import ObjectId
from datetime import datetime, timedelta


class Announcement:
    def __init__(self):
        self.collection = get_collection('announcements')

    def create(self, message, created_by, duration_hours=2, priority='normal'):
        """공지 생성"""
        now = datetime.utcnow()
        doc = {
            'message': message,
            'created_by': ObjectId(created_by),
            'priority': priority,  # 'normal', 'urgent'
            'duration_hours': duration_hours,
            'created_at': now,
            'expires_at': now + timedelta(hours=duration_hours),
            'is_active': True,
        }
        result = self.collection.insert_one(doc)
        doc['_id'] = result.inserted_id
        return doc

    def get_active(self):
        """현재 활성화된 공지 목록"""
        now = datetime.utcnow()
        return list(
            self.collection.find({
                'is_active': True,
                'expires_at': {'$gt': now},
            }).sort('created_at', -1)
        )

    def get_all(self, page=1, per_page=20):
        """전체 공지 목록 (관리자용)"""
        total = self.collection.count_documents({})
        items = list(
            self.collection.find()
            .sort('created_at', -1)
            .skip((page - 1) * per_page)
            .limit(per_page)
        )
        return items, total

    def delete(self, announcement_id):
        """공지 삭제"""
        return self.collection.delete_one({'_id': ObjectId(announcement_id)})

    def deactivate(self, announcement_id):
        """공지 비활성화 (즉시 종료)"""
        return self.collection.update_one(
            {'_id': ObjectId(announcement_id)},
            {'$set': {'is_active': False}}
        )
