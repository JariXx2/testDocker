const express = require("express");
const app = express();
const port = 3000;
const Migrator = require("./migrator");
const cron = require("node-cron");
const GoogleSheetsService = require("./googleSheets");

const migrator = new Migrator();
const googleSheetsService = new GoogleSheetsService("./credentials.json");

const spreadsheetIds = ["1S7dNESwdHj03t9rUFHhSA0uZlOLZFY8vC5j6szbwn9k","1Ph3MtTV1k_Mi2kplMnGziPbsa3G-6-uygeHzTGrUZck"];

async function startApp() {
    try {
        await migrator.connect();
        await migrator.runMigrations();

        const warehouseData = await migrator.getWarehouseData();
        if (warehouseData) {
            await migrator.saveWarehouseData(warehouseData);
        }

        const dataFromDB = await migrator.getDataFromDB();
        if (dataFromDB) {
            const sortedData = googleSheetsService.sortDataByCoefficient(dataFromDB, "box_delivery_and_storage_expr");
            for (const spreadsheetId of spreadsheetIds) {
                await googleSheetsService.exportData(spreadsheetId, sortedData);
            }
        }

        cron.schedule("0 * * * *", async () => {
            console.log("Запуск задачи по получению данных о тарифах коробов");
            try {
                const warehouseData = await migrator.getWarehouseData();
                if (warehouseData) {
                    await migrator.saveWarehouseData(warehouseData);
                }
                const dataFromDB = await migrator.getDataFromDB();
                if (dataFromDB) {
                    const sortedData = googleSheetsService.sortDataByCoefficient(
                        dataFromDB,
                        "box_delivery_and_storage_expr"
                    );
                    for (const spreadsheetId of spreadsheetIds) {
                        await googleSheetsService.exportData(spreadsheetId, sortedData);
                    }
                }
                console.log("Задача по получению и сохранению данных выполнена успешно");
            } catch (error) {
                console.error("Ошибка при выполнении задачи: ", error);
            }
        });
    } catch (error) {
        console.error("Ошибка запуска приложения: ", error);
    } finally {
        app.get("/", (req, res) => {
            res.send("Hello World!");
        });

        app.listen(port, () => {
            console.log(`App listening at http://localhost:${port}`);
        });
    }
}

startApp();
