const express = require('express');
const app = express();

const path = require('path');
const cors = require('cors');
const mysql = require('promise-mysql');
const session = require('express-session');
const flash = require('connect-flash');
const { exec } = require('child_process');
const xlsx = require('xlsx');
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



// app.get('/attendance',requireLoginMiddleware,function(req,res){
//     // res.send("This is our home page");
//     res.render('AttendancePage.ejs',{nickname:req.session.nickname,user_id:req.session.user_id});

// });


// function passwordCheckingMiddleware(req,res,next){

//     // let demoregno = [1701105429,];


//     let demopasswords = [12345678,54545,105429,105441,105430];
    
    
//     let pass_present = false;
//     for(let i=0;i<=demopasswords.length;i++){
//         if(  parseInt(req.body.password) ===demopasswords[i]   ){
//             pass_present = true;
//             break;
//         }
//     }
//     if( pass_present ){
//         next();
//     }
//     else{
//         res.redirect('/');
//     }
// }

// app.post('/',passwordCheckingMiddleware,function(req,res){
//     res.redirect('/attendance');
// });


// app.get('/timetable',requireLoginMiddleware,function(req,res){
//     res.render('timetable.ejs');
// })



/* ------------------------- New journey ----------------------------*/
app.get('/',function(req,res){
    res.redirect('/login'); //should render a home page
});


app.get('/login',function(req,res){
    res.render('TeaLoginPage');
})

app.post('/login',async function(req,res,next){
    try{
        const {regdno:input_teaID,password:input_pass} = req.body;
        // console.log(req.body);
        console.log('details from input page ',input_teaID,'---------',input_pass);

        let queryStringForGettingPassword = `select tea_name,tea_pass from teachers where tea_id='${input_teaID}'`;
        let result = await globalDBConnector.query(queryStringForGettingPassword); 
        console.log(result);
        if(result.length>0  && result[0].tea_pass === input_pass   ){
            req.session.user_id = input_teaID;
            req.session.nickname = result[0].tea_name;
            console.log("Password matched , autheticated person");
            // res.render('AttendancePage',{nickname:req.session.nickname});
            res.redirect('/teaallsubjects');
        }
        else{

            req.flash('errormessage','INVALID USERNAME OR PASSWORD');
            console.log("Invalid user name OR password");
            return res.redirect('/login');
        }

    }
    catch(e){
        next(e)
    }
})

app.get('/logout',async function(req,res){
    req.session.destroy();
    res.redirect('/login');
})
/* -----------------------------------                   ---------------------------*/
app.get('/teaallsubjects',requireLoginMiddleware,function(req,res){
    res.render('TeaAllSubjects');
})

app.get('/teaonesubreport/:subid',requireLoginMiddleware,async function(req,res,next){
    try{
        const subid= req.params.subid;
        // console.log("()()()()()()()()()())()()",subid,req.params,"()()()()()()()()()())()()");
        let noOfLessonsQuery = `select count(*) as noOfLessons from lessons where sub_id='${subid}'`
        let resObtainedFromDB;
        resObtainedFromDB = await globalDBConnector.query(noOfLessonsQuery);
        let noOfLessons= resObtainedFromDB[0].noOfLessons;
        // console.log(noOfLessons);

        let nameOfSubjectQuery = `SELECT sub_name FROM subjects WHERE sub_id = '${subid}';`
        resObtainedFromDB = await globalDBConnector.query(nameOfSubjectQuery);
        let nameOfSub = resObtainedFromDB[0].sub_name;
        // console.log(nameOfSub);

        let requiredInfoForTeaOneSubRep = {}
        requiredInfoForTeaOneSubRep.lessonsCount = noOfLessons; 
        requiredInfoForTeaOneSubRep.subName = nameOfSub; 


        let reqMainInfoquery = `WITH firstCTE as (
                                        SELECT stu_id, count(*)  as presentCountInSem  FROM attendance 
                                        WHERE les_id in ( SELECT les_id FROM lessons WHERE sub_id = '${subid}' ) 
                                        AND times_found >= 8
                                        GROUP BY stu_id )
                    SELECT fc.stu_id,st.stu_name,fc.presentCountInSem  FROM firstCTE AS fc
                    INNER JOIN students as st 
                    ON fc.stu_id = st.stu_id
                    ORDER BY fc.stu_id
                    `
        resObtainedFromDB = await globalDBConnector.query(reqMainInfoquery);
        // console.log(resObtainedFromDB)
        requiredInfoForTeaOneSubRep.mainInfo = resObtainedFromDB;
        
        let dynamicLink = `/testTea/${subid}`
        res.render('TeaOneSubjectReport',{requiredInfoForTeaOneSubRep, dynamicLink})
        // res.redirect('/teaallsubjects') // tea allsubjects - teacher all subjects
    }
    catch(e){
        next(e)
    }
})

app.get('/testTea/:subid',requireLoginMiddleware,async function(req,res,next){
    try{
        const subid= req.params.subid;
        console.log("reached testTea with ",subid,req.params)
        // res.redirect('/record');
        // res.send((`you are requesting ${sub_id}`));

        let subjectReportQueryStrForTea = `WITH firstCTE AS(
            select * from attendance 
            where les_id in (SELECT les_id from lessons where sub_id='${subid}')
        ) SELECT firstCTE.stu_id,firstCTE.times_found,lessons.held_on from firstCTE INNER JOIN
          lessons ON firstCTE.les_id = lessons.les_id
          ORDER BY lessons.held_on,firstCTE.stu_id`;

        let resObtainedFromDB = await globalDBConnector.query(subjectReportQueryStrForTea);
    
        let finalJSONObj =[];
        let reqMap = new Map();
        for(let i=0;i<resObtainedFromDB.length;i++){
        // // console.log ( JSON.stringify( resObtainedFromDB[i]['held_on'] ).split('T')[0].substr(1)  );  
        //     // let curentLessonHeldOn = JSON.stringify( resObtainedFromDB[i]['held_on'] ).split('T')[0].substr(1);
            let istArr =resObtainedFromDB[i]['held_on'].toString().split(' ');
        //     // console.log(istArr);
            let curentLessonHeldOn = `${istArr[2]}-${istArr[1]}-${istArr[3]}`;
            let stuId =  resObtainedFromDB[i]['stu_id'];
            let timesFoundIncurrentLesson = Number(resObtainedFromDB[i].times_found) ;
            
        //     // console.log(resObtainedFromDB[i]['held_on'] ,'------------------>',curentLessonHeldOn,'---------------->',resObtainedFromDB[i]['held_on'].toString()  );
        //     let singleOBJ = {
        //         "Reg NO": resObtainedFromDB[i]['stu_id']
        //     }
        //     singleOBJ[curentLessonHeldOn] = timesFoundIncurrentLesson;

        //     finalJSONObj.push(singleOBJ);

            if(!reqMap.has(curentLessonHeldOn) ){
                // reqMap.set(curentLessonHeldOn,{'Day':curentLessonHeldOn})
                reqMap.set(curentLessonHeldOn,{})

            }
            let tempObj1 = reqMap.get(curentLessonHeldOn);
            // tempObj1[stuId] = timesFoundIncurrentLesson;
            if(timesFoundIncurrentLesson >= 8){
                tempObj1[stuId] = "Present";
            }
            else{
                tempObj1[stuId] = "Absent";
            }
            reqMap.set(curentLessonHeldOn,tempObj1);
        }

        reqMap.forEach((value,key,map)=>{
            // console.log(key,value);
            value["Days"] = key;
            finalJSONObj.push(value);

        })

       

        // res.send(extractedInfo);

        // res.render('OneSubjectReport',{extractedInfo});
        // console.log(finalJSONObj)

        let fileNameWIthPath = `./RequestedFiles/${subid}.xlsx`  //'./StuInfo.xlsx'
        excelWriter(fileNameWIthPath,finalJSONObj,`${subid}`);     //excelWriter(fileNameWIthPath,finalJSONObj,'Sheet1');
       
        res.download(fileNameWIthPath);
        // res.send("ok");
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



app.listen(6030,function(){
    console.log("server listening on 6030");
});


function excelWriter(filePath, contentTobeWritenInTheWorkbook_in_json_format, nameOfTheSheet) {
    //eta ete efiicient nuhe, har time workook new banae, override heijae workbook taa, Naa ki sei gote sheet ku jai update kare, kichi asubidha nahi, pura bhala chdi haba darkar nahi
    // Sir kahile ki , khojithile hei thanta, but ete time dabaku se chahun nathile.
    
        // console.log(xlsx.readFile(filePath));
        let newWB = xlsx.utils.book_new();
        // console.log(contentTobeWritenInTheWorkbook_in_json_format);
        let newWS = xlsx.utils.json_to_sheet(contentTobeWritenInTheWorkbook_in_json_format);
        // msd.xlsx-> msd
        //workbook name as param
        xlsx.utils.book_append_sheet(newWB, newWS, nameOfTheSheet);
        //   file => create , replace
        //    replace
        xlsx.writeFile(newWB, filePath);
    }
    