/**
 * Created by admin on 2018/2/8.
 */

class Publish{
    constructor(type,config){
        this.type=type;
        let dbClient = null;
        if(type=='mysql'){
            dbClient = new MysqlDb(config);
        }else if(type=='mongodb'){
            dbClient = new MongoDB(config);
        }else if(type=="mssql"){
            dbClient = new MsSql(config)
        }
        this.dbCliet = dbClient;
    }
    write(originData,tb_name){
        let clientData = {};
        if(Publish.templateMap){
            let template = Publish.templateMap;
            for(let field in template){
                clientData[field] = originData[template[field]];
            }
        }else {
            clientData = originData;
        }
        return this.dbCliet.write(clientData,tb_name);
    }
    getDbNameList(){
        return this.dbCliet.getDbNameList();
    }
    getTableList(){
        return this.dbCliet.getTableList();
    }
    connect(config){
        return  this.dbCliet.connect(config);
    }
    close() {
        return this.dbCliet.close();
    }
    hasTable(tb_name){
        return this.dbCliet.hasTable(tb_name)
    }
    getColumnsInfo(tb_name){
        return this.dbCliet.getColumnsInfo(tb_name)
    }
}
Publish.templatekey = null;
Publish.templateMap = null;
Publish.ignoreError = true;

class MongoDB {
    constructor(config){
        if (!this.client){
            this.client = require('mongodb').MongoClient;
        }
        this.dbconfig = config ;
    }

    close(){
        return this.connection.then((db)=>{
            db.close();
        }).catch((err)=>{});
    }

    connect(){
        let host = this.dbconfig.host;
        let port = this.dbconfig.port || 27017;
        let authInfo = '';
        if (this.dbconfig.username && this.dbconfig.password){
            authInfo = encodeURIComponent(this.dbconfig.username)  + ":" + encodeURIComponent(this.dbconfig.password) + "@";
        }
        let server = "mongodb://" + authInfo + host +":" + port;
        return this.connection = this.client.connect(server);
    }

    write(data,tableName){
        let dbName = this.dbconfig.database;
        return this.connection.then((db)=>{
            let database = db.db(dbName);
            let collect  = database.collection(tableName);
            return collect.insertOne(data).then((res)=>{
                return {status:0}
            }).catch((err)=>{
                return {status:1,error:err}
            });

        })

    }
}

var knex = require('knex');
class MysqlDb{
    constructor(connection){
        connection.user= connection.username;
        delete connection.username;
        this.config = {
            client:"mysql",
            connection:connection,

        };
        if(this.knex){
            return this.knex;
        }else{
            this.knex = knex(this.config)
        }
    }

    getDbNameList(){
        return this.knex.raw('SHOW DATABASES').then(function(resp) {
            let dbNameList = [];
            for(let i in resp[0]){
                let name = resp[0][i]['Database'];
                if(name!="information_schema"){
                    dbNameList.push(name)
                }
            }
            return dbNameList;
        }).catch((reason)=> {
            return [];
        })
    }
    getTableList(){
        return this.knex.raw('SHOW  TABLES').then((resp)=> {
            let tableNameList = [];
            for(let i in resp[0]){
                let table = resp[0][i];
                for(let key in table){
                    let name = table[key];
                    tableNameList.push(name)
                }
            }
            return tableNameList;
        }).catch((reason)=> {
            return [];
        });
    }
    getColumnsInfo(tb_name){
        return this.knex.raw('SHOW FULL COLUMNS FROM '+tb_name).then(function(resp) {
            let columnsInfo = {};
            for(let i in resp[0]){
                let field = resp[0][i];
                let info = {
                    name:field['Field'],
                    type:field['Type'],
                    null:field['Null'],
                    key :field['Key']
                }
                columnsInfo[field['Field']] = info;
            }
            return columnsInfo;
        }).catch((reason)=> {
            return {};
        });
    }
    connect(){
        return this.knex.raw('SHOW DATABASES');//1.返回promise,2,真实操作一次
    }
    write(data,tb_name){
        var rows = [data];
        var chunkSize = 3000;
        return this.knex.batchInsert(tb_name, rows, chunkSize).then((ids)=> {
            return {ids:ids,status:0};
        }).catch((error)=> {
            return {error:error,status:1};
        });
    }
    hasTable(tb_name){
        return this.knex.schema.hasTable(tb_name).then(function(exists) {
            if (!exists) {
                return true;
            }else{
                return false;
            }
        }).catch((reason)=>{
            return false;
        });
    }
    close(){
        if(this.knex){
            this.knex.client.destroy((res)=>{
                this.knex = null;
                return true;
            });
        }
    }
}

class MsSql{
    constructor(connection){
        let config = {
            client:"mssql",
            connection:{
                server : connection.host,
                user : connection.username,
                password : connection.password,
                database : connection.database,
            },
            options:{
                port : connection.port,
                encrypt : true,
            },
        };

        this.dbConfig = config;
        if(this.knex){
            return this.knex;
        }else{
            this.knex = knex(config)
        }
    }

    connect(){
        return  this.knex.raw('SELECT name FROM master.dbo.sysdatabases');
    }

    getDbNameList(){
        return this.knex.raw('SELECT name FROM master.dbo.sysdatabases').then(function(res) {
            let dbNameList = [];
            for(let i in res){
                let name = res[i].name;
                dbNameList.push(name)
            }
            return dbNameList;
        }).catch((reason)=> {
            return [];
        })
    }

    getTableList(){
        return this.knex.raw("select name from  sys.tables  where type='U'").then((res)=> {
            let tableNameList = [];
            for (let i in res){
                tableNameList.push(res[i].name)
            }

            return tableNameList;
        }).catch((reason)=> {
            return [];
        });
    }
    hasTable(tb_name){
        return this.knex.schema.hasTable(tb_name).then(function(exists) {
            if (!exists) {
                return true;
            }else{
                return false;
            }
        }).catch((reason)=>{
            return false;
        });
    }

    getColumnsInfo(tb_name){
        if(!tb_name){
            return false;
        }
        return this.knex.raw("SELECT column_name,data_type,is_nullable FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = '"+tb_name+"'").then(function(resp) {
            let columnsInfo = {};
            for(let i in resp){
                let field = resp[i];
                let info = {
                    name:field['column_name'],
                    type:field['data_type'],
                    null:field['is_nullable'],
                }
                columnsInfo[field['column_name']] = info;
            }
            return columnsInfo;
        }).catch((reason)=> {
            return false;
        });
    }
    close(){
        if(this.knex){
            this.knex.client.destroy((res)=>{
                this.knex = null;
                return true;
            });
        }
    }

    write(data,tb_name){
        return this.knex(tb_name).insert(data).then((res)=>{
            return {status:0,ids:res}
        }).catch((err)=>{
            return {error:err,status:1}
        });
    }
}