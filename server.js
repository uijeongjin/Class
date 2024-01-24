//dotenv 설정
require('dotenv').config();
const express = require('express');
const bcrypt = require('bcrypt');
const session = require('express-session');
const { MongoClient, ObjectId } = require('mongodb');

const { createServer } = require('http');
const { Server } = require('socket.io');



const app = express();

// bodyparser 설정  
app.use(express.urlencoded({ extended: true })); // 폼 데이터 처리
app.use(express.json()); // JSON 데이터 처리


app.use(session({
    secret: process.env.SESSION_SECRET, // 세션 암호화 키
    resave: false, // 세션 데이터가 변경되지 않았을 때도 세션 저장소에 다시 저장할지 여부
    saveUninitialized: true, // 세션이 초기화되지 않은 상태로 저장할지 여부
    cookie: {
      secure: false, // HTTPS를 사용할 경우 true로 설정
      maxAge: 1000 * 60 * 60 // 쿠키 유효 시간 (예: 1시간)
    }
  }));

// 세션 확인 로직 미들웨어
app.use((req, res, next) => {
    res.locals.userId = req.session.userId;
    next();
});

// ejs 설정
app.set('view engine', 'ejs');
// 정적 파일 제공을 위한 내장 미들웨어 설정
app.use(express.static('public'));


const uri = process.env.DB_URL;
const client = new MongoClient(uri);


const server = createServer(app);
const io = new Server(server);

client.connect()
    .then(() => {
        db = client.db('class');
        const mainPage = require('./routes/main')(db);
        const users = require('./routes/users')(db);
        const classMoudule = require('./routes/class')(db);

        app.use(mainPage);
        app.use(users);
        app.use(classMoudule);

        server.listen(process.env.PORT, () => {
            console.log(`서버 실행중: http://localhost:${process.env.PORT}`);
        });
        io.on('connection', (socket) => {
            socket.on('ask-join', async (data) => {
                socket.join(data);
            });
            socket.on('inputValue', async (data) => {
                io.to(data.room).emit('chat', data);
            });
          })
    })
    .catch(err => {
        console.error('MongoDB 연결 실패:', err);
    });





