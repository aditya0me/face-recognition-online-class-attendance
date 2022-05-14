const mysql = require('promise-mysql');

let globalDBConnector;
const getDbConnection = async () => {
    console.log("Attempting to connect to database");
    return await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: 'Project@005',
        database: 'pro5'
    })
}

// (async function startConnectTodataBase(){
//         globalDBConnector = await getDbConnection()
//    })();

let dateArr = [];

let ttArr = [ ['erp','iot','cns','sc'],
              ['spm','sc','erp','iot'], 
              ['cns','spm','iot'], 
              ['erp','spm','cns','sc'], 
              ['compviva','compviva','compviva','seminar','seminar','seminar'], 
              ['eng','minpro','minpro','minpro']
            ];

async function runIt() {
    globalDBConnector = await getDbConnection();

    let dd = 10;
    // let month = ;
    for(let i=0;i<6;i++){
        let formattedDay = `2021-05-${dd}`;
        dateArr.push(formattedDay);
        dd++;
    }
    console.log(dateArr);

    for(let i=0;i<6;i++){
        for(let j=0;j<ttArr[i].length;j++){
            // let queryStr1 = `select * from subjects where sub_id='${ttArr[i][j]}' `;

            let queryStr2= `insert into lessons(sub_id,held_on) values('${ttArr[i][j]}','${dateArr[i]}')`;

            let res = await globalDBConnector.query(queryStr2);
            
            // console.log(res);
        }
    }

    globalDBConnector.end();

}

runIt();

async function runIt2(){
    globalDBConnector = await getDbConnection();

    for(let j=0;j<ttArr[5].length;j++){
        let queryStr2= `insert into lessons(sub_id,held_on) values('${ttArr[5][j]}','2021-05-1')`;
        let res=await globalDBConnector.query(queryStr2);
        console.log(res);
    }

    globalDBConnector.end();
};
