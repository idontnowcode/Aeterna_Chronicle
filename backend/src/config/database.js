/**
 * 데이터베이스 연결
 * - MONGODB_URI가 설정된 경우: 실제 MongoDB 사용
 * - 미설정 시: 인메모리 스토어 사용 (프로토타입 모드)
 */

async function connectMongoDB() {
  const uri = process.env.MONGODB_URI;
  if (uri) {
    const mongoose = require('mongoose');
    await mongoose.connect(uri);
    console.log('[DB] MongoDB 연결 완료');
  } else {
    console.log('[DB] 인메모리 모드로 실행 중 (데이터는 재시작 시 초기화됩니다)');
  }
}

async function disconnectMongoDB() {
  if (process.env.MONGODB_URI) {
    const mongoose = require('mongoose');
    await mongoose.disconnect();
  }
}

module.exports = { connectMongoDB, disconnectMongoDB };
