const express = require('express');
const app = express();

const path = require('path');
const cors = require('cors');
const mysql = require('promise-mysql');
const session = require('express-session');
const flash = require('connect-flash');
const { exec } = require('child_process');
const databaseConfig = require('../databaseConfig.js');
/* --------------- database conection part-------------------  */
let globalDBConnector ;
const getDbConnection = async () => {
    console.log("Attempting to connect to database");
      return await mysql.createConnection(databaseConfig.mySqlDatabaseConfig)
    }

(async function startConnectTodataBase(){
        globalDBConnector = await getDbConnection()
   })();
   
/*  *****************************************************************************   */
/* -----------------            session setup                        --------------------------- */

let sessionConfig = {
    secret:'thisisnotagoodsecret',
    // resave:false,
    // saveUninitialized:false
};
app.use(session(sessionConfig));
/* **********************************************************  */

/* ------------------------- flash setup ---------------------------------------------- */
app.use(flash());
app.use(function myCustomMidlewareforflash(req,res,next){
    res.locals.errormessage = req.flash('errormessage');
    next();
});
/* *************************************************************************************  */

/* -----------------  require login middleware --------------------------------------*/
function requireLoginMiddleware(req,res,next){
    if(req.session.user_id){
        next();
    }
    else{
        req.flash('errormessage','YOU NEED TO LOGIN TO VIEW THE REQUESTED PAGE');
        res.redirect('/login');
    }
}
/* ******************************************************** */


app.use(express.urlencoded({extended:true}));
app.use(express.json());


app.use(cors());

app.set('view engine','ejs');
app.set('views', path.join(__dirname,"/views") );

app.use(express.static(path.join(__dirname,'public')   )  );



app.get('/attendance',requireLoginMiddleware,function(req,res){
    // res.send("This is our home page");
    res.render('AttendancePage.ejs',{nickname:req.session.nickname,user_id:req.session.user_id});

});

app.get('/',function(req,res){
    res.redirect('/login');
});

function passwordCheckingMiddleware(req,res,next){

    // let demoregno = [1701105429,];


    let demopasswords = [12345678,54545,105429,105441,105430];
    
    
    let pass_present = false;
    for(let i=0;i<=demopasswords.length;i++){
        if(  parseInt(req.body.password) ===demopasswords[i]   ){
            pass_present = true;
            break;
        }
    }
    if( pass_present ){
        next();
    }
    else{
        res.redirect('/');
    }
}

app.post('/',passwordCheckingMiddleware,function(req,res){
    console.log("You can comment me out");
    res.redirect('/attendance');
});


app.get('/timetable',requireLoginMiddleware,function(req,res){
    res.render('timetable.ejs');
})



/* ------------------------- New journey ----------------------------*/


app.get('/login',function(req,res,next){
    res.render('LoginPage');
});

app.post('/login',async function(req,res,next){
    try{
        const {regdno:input_regdno,password:input_pass} = req.body;
        // console.log(req.body);
        console.log('details from input page ',input_regdno,'---------',input_pass);

        let queryStringForGettingPassword = `select stu_pass,stu_name from students where stu_id=${input_regdno}`;
        let result = await globalDBConnector.query(queryStringForGettingPassword); 
        console.log(result);
        if(result.length>0  && result[0].stu_pass === input_pass   ){
            req.session.user_id = input_regdno;
            req.session.nickname = result[0].stu_name;
            console.log("Password matched , autheticated person");
            // res.render('AttendancePage',{nickname:req.session.nickname});
            res.redirect('/attendance');
        }
        else{

            req.flash('errormessage','INVALID USERNAME OR PASSWORD');
            console.log("Invalid user name OR password");
            return res.redirect('/login');
        }

    }
    catch(e){
        next(e);
    }
});

app.get('/incr',function(req,res){
    res.render('partials/dummyIncrPage');
});

app.post('/incr',async function(req,res,next){
    console.log("inside the incr count function haa");
    try{
        
        const input_regdno = req.body.regdNo;
        console.log( req.body.re, input_regdno );
        let queryStringMade = `
        update attendance 
        set times_found=times_found+1
        where les_id = ( select latest_lesid from latestLessionId) AND stu_id= ${input_regdno}
        `;
        
        let result = await globalDBConnector.query(queryStringMade);
        // console.log(result);
        console.log('>>>>>>>>>>>',result.affectedRows,'<<<<<<<','succesfully incremented count in attendance table');
        if( Number(result.affectedRows) === 1  ){
            return res.send('Hurray!! Your count succesfully incremented in the databse.');
        }
        else{
            res.send('Sorry :( your count could not be incremented, may be due to some server issue OR issue in the query string OR invalid user OR issue in the databse');
        }

        // res.redirect('/incrcountincurrentles');
    }
    catch(e){
        next(e);        
    }
});


app.get('/logout',requireLoginMiddleware,function(req,res){
    req.session.destroy();
    res.redirect('/login');
})

app.get('/record',requireLoginMiddleware,function(req,res){
    res.render('RecordPage');
});

app.get('/record/:subid',requireLoginMiddleware,async function(req,res,next){
    try{
        const subid= req.params.subid;
        console.log(subid,req.params);
        // res.redirect('/record');
        // res.send((`you are requesting ${sub_id}`));

        let subjectReportQueryStr = `SELECT les.held_on, att.times_found 
        FROM attendance AS att
        INNER JOIN lessons AS les ON
        att.les_id = les.les_id
        where att.stu_id='${req.session.user_id}' AND les.sub_id='${subid}'
        order by les.held_on `;

        let resObtainedFromDB = await globalDBConnector.query(subjectReportQueryStr);

        let extractedInfo = {
            noOflessons: resObtainedFromDB.length,
            totaTimesPresent: 0,
            individualLessons : []
        };


        for(let i=0;i<resObtainedFromDB.length;i++){
        // console.log ( JSON.stringify( resObtainedFromDB[i]['held_on'] ).split('T')[0].substr(1)  );  
            // let curentLessonHeldOn = JSON.stringify( resObtainedFromDB[i]['held_on'] ).split('T')[0].substr(1);
            let istArr =resObtainedFromDB[i]['held_on'].toString().split(' ');
            // console.log(istArr);
            let curentLessonHeldOn = `${istArr[2]} ${istArr[1]} ${istArr[3]}`; 
            let timesFoundIncurrentLesson = Number(resObtainedFromDB[i].times_found) ;
            
            console.log(resObtainedFromDB[i]['held_on'] ,'------------------>',curentLessonHeldOn,'---------------->',resObtainedFromDB[i]['held_on'].toString()  );

           if(Number( timesFoundIncurrentLesson ) >= 8  ){
               extractedInfo.totaTimesPresent+=1;
           }

           let tempObj = {
               ondate: curentLessonHeldOn ,
               noOfImgContainUser:timesFoundIncurrentLesson
           };
           extractedInfo.individualLessons.push(tempObj);
        }

        // console.log( typeof 'hoo');
        // console.log( resObtainedFromDB[0]['held_on'].toString() ); 
        // console.log( resObtainedFromDB[0]['held_on'].toString().split('T').shift()[0] ); 

        // console.log( resObtainedFromDB[0].held_on  );
        // console.log( typeof resObtainedFromDB[0].held_on  );
        // console.log( JSON.stringify( resObtainedFromDB[0].held_on)  );

        // console.log( resObtainedFromDB[0].times_found  );
        // console.log( typeof resObtainedFromDB[0].times_found  );
        // console.log( Number( resObtainedFromDB[0].times_found )  );

        // res.send(extractedInfo);

        res.render('OneSubjectReport',{extractedInfo});
    }
    catch(e){
        next(e);
    }


});


//jetebele kichi url match karibani ethi pahchiba
app.use(function(req,res){
    res.render("notfound.ejs");
});


app.use(function customErrorHandlerMiddleware(err,req,res,next){
    console.log("reached --------------------------------- custome error handler middleware function ----------------");
    const {statusCode=500} = err;
    // console.log(err);
    if(!err.message) err.message = "Oh no! Something went wrong";
    // res.status(statusCode).send(`emiti hau thila initial step re ${err.message} `);
    res.status(statusCode).render('ErrorPage',{err});
});



app.listen(5000,function(){
    console.log("server listening on 5000");
});



