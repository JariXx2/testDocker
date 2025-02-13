const express = require("express");
const app = express();
const port = 3000;
const Migrator = require("./migrator");
const cron = require("node-cron");

const migrator = new Migrator();

async function startApp() {
    try {
        await migrator.connect();
        await migrator.runMigrations();

        const warehouseData = await migrator.getWarehouseData();
        if (warehouseData) {
            await migrator.saveWarehouseData(warehouseData);
        }

        cron.schedule("0 * * * *", async () => {
            console.log("Запуск задачи по получению данных о тарифах коробов");
            try {
                const warehouseData = await migrator.getWarehouseData();
                if (warehouseData) {
                    await migrator.saveWarehouseData(warehouseData);
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
