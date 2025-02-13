const express = require("express");
const app = express();
const port = 3000;
const Migrator = require('./migrator')

const migrator = new Migrator();

async function startApp() {
    try{
        await migrator.connect();
        await migrator.runMigrations();

        const warehouseData = await migrator.getWarehouseData();
        if(warehouseData){
            await migrator.saveWarehouseData(warehouseData)
        }
    }catch (error){
        console.error("Ошибка запуска приложения: ",error)
    }
}

startApp();
