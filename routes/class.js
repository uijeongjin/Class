//dotenv 설정
require('dotenv').config();
const express = require('express');
const bcrypt = require('bcrypt');
const session = require('express-session');
const { MongoClient, ObjectId } = require('mongodb');

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
const router = express.Router();


module.exports = function(db) {
// class 생성 페이지로 이동
router.get('/createClassPage', async(req, res)=> {
    try{
        if(req.session.userId){
            res.render('createClass.ejs');
        }else {
            res.redirect('/loginPage');
        }
    }catch (err){
        console.log(err);
        res.status(404).send('서버오류')
    }
})
// class 생성 과정 = db에 저장 -> 클래스 상세페이지 생성
// class 정보 db에 저장
router.post('/createClass', async(req, res)=> {
    try{
        if(req.session.userId){
            const result = await db.collection('class')
            .insertOne({
                createUserId : req.session.userId,
                users : [req.session.username],
                className : req.body.className,
                clasDescription : req.body.classDescription,
                inviteCode : req.body.classCode
            });
            res.redirect(`/classList/${req.session.userId}`)
        }else {
            res.status(403).send('권한 없음');
        }
    }catch (err){
        console.log(err);
        res.status(500).send('서버오류');
    }
})
// class 상세페이지 생성
router.get('/classDetailPage/:id', async(req, res)=> {
    try{
        const classInfo = await db.collection('class').findOne({_id : new ObjectId(req.params.id)});
        const chatLog = await db.collection('chatting').find({classId : req.params.id}).toArray();
        const username = req.session.username;
        if(chatLog){
            res.render('classDetailPage.ejs', {classInfo : classInfo, chatLog : chatLog, username : username});
        }else{
            res.render('classDetailPage.ejs', {classInfo : classInfo, username : username});
        }
        
    }catch (err){
        console.log(err);
        res.status(500).send('서버오류');
    }
})
// class 참여코드 입력 페이지로 이동
router.get('/joinClassPage', async(req, res)=> {
    try{
        if(req.session.userId){
            res.render('joinClass.ejs');
        }
    }catch{
        console.log(err);
        res.status(500).send('서버오류');
    }
})
// class 에 참여하는 기능
router.post('/joinClass', async(req, res)=> {
    try{
        if(req.session.userId){
            const classInfo = await db.collection('class').findOne({inviteCode : req.body.inviteValue});
            if(classInfo){
                const filter = {_id : classInfo._id};
                const update = { $set : { users : [...classInfo.users, req.session.username ]}};
                await db.collection('class').updateOne(filter, update, (err, result) =>{
                    if(err) throw err;
                })
                res.redirect(`/classList/${req.session.userId}`)
            }
        }else{
            res.status(404).send('로그인 후 이용하세요.')
        }
    }catch (err){
        console.log(err);
        res.status(500).send('서버오류');
    }
})


// 참여한 class 목록
router.get('/classList/:id', async (req, res) => {
    try {
        if(req.session.userId){
            const classInfo = await db.collection('class').find({ users : req.session.username}).toArray();
            if (classInfo) {
                res.render('classList.ejs', { classInfo });
            } else {
                res.status(404).send('클래스를 찾을 수 없습니다.');
            }
        } else {
            res.redirect('/loginPage');
        }
        
    } catch (err) {
        console.error(err);
        res.status(500).send('서버 오류');
    }
});


// class 채팅 로그 저장
router.post('/chat', async(req, res)=> {
    try{
        if(req.session.userId){
            await db.collection('chatting')
            .insertOne({
                classId : req.body.classId,
                username : req.session.username,
                message : req.body.chatting
            })
        } else {
            res.redirect('/loginPage');
        }
        
    }catch (err){
        console.log(err);
        res.status(500).send('서버오류');
    }
})


    return router;
};








