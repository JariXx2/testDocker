const {Client} = require("pg");
const axios = require("axios");

class Migrator {
    constructor() {
        this.client = new Client({
            user: process.env.DB_USER || "postgres",
            password: process.env.DB_PASSWORD || "postgres",
            host: process.env.DB_HOST || "localhost",
            port: process.env.DB_PORT || 5432,
            database: process.env.DB_NAME || "postgres",
        });
    }

    async connect() {
        await this.client.connect();
    }

    async disconnect() {
        await this.client.end();
    }

    async getWarehouseData() {
        try {
            const today = new Date().toISOString().slice(0, 10);
            const response = await axios.get(`https://common-api.wildberries.ru/api/v1/tariffs/box?date=${today}`, {
                headers: {
                    Authorization:
                        "eyJhbGciOiJFUzI1NiIsImtpZCI6IjIwMjQxMDE2djEiLCJ0eXAiOiJKV1QifQ.eyJlbnQiOjEsImV4cCI6MTc0NjA2ODAxNywiaWQiOiIwMTkyZGRlYS1mOWU2LTcxNzItODk0Ny1iMjE1Y2I5MmU5NDgiLCJpaWQiOjQ1OTExNjA5LCJvaWQiOjExMzA0NiwicyI6MTA3Mzc0MTgzMiwic2lkIjoiOTMyYzE3NmEtNTA4NS01YzZmLWJjMzMtNGU4NGNkZjU4ZDdlIiwidCI6ZmFsc2UsInVpZCI6NDU5MTE2MDl9.l2C-kGr-1YptJ5iyp_q1RYSxDOgENHXfGepnmo709g2UsGDnT90NnBt5K-nVLVH14XaEFi81dcmeZvF6qz-oxQ",
                },
            });
            return response.data;
        } catch (error) {
            console.error("Ошибка при получении данных о тарифах коробов:", error);
            return null;
        }
    }

    async saveWarehouseData(data) {
        if (!data || !data.response || !data.response.data || !data.response.data.warehouseList) {
            console.log("Нет данных для сохранения.");
            return;
        }

        const {warehouseList, dtNextBox, dtTillMax} = data.response.data;

        for (const warehouse of warehouseList) {
            const {
                warehouseName,
                boxDeliveryAndStorageExpr,
                boxDeliveryBase,
                boxDeliveryLiter,
                boxStorageBase,
                boxStorageLiter,
            } = warehouse;

            const query = `
            INSERT INTO warehouse_box_rates (
              warehouse_name, 
              box_delivery_and_storage_expr, 
              box_delivery_base, 
              box_delivery_liter, 
              box_storage_base, 
              box_storage_liter,
              dtNextBox,
              dtTillMax
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            ON CONFLICT (warehouse_name) DO UPDATE SET
              box_delivery_and_storage_expr = EXCLUDED.box_delivery_and_storage_expr,
              box_delivery_base = EXCLUDED.box_delivery_base,
              box_delivery_liter = EXCLUDED.box_delivery_liter,
              box_storage_base = EXCLUDED.box_storage_base,
              box_storage_liter = EXCLUDED.box_storage_liter,
              dtNextBox = EXCLUDED.dtNextBox,
              dtTillMax = EXCLUDED.dtTillMax;`;

            try {
                await this.client.query(query, [
                    warehouseName,
                    boxDeliveryAndStorageExpr,
                    boxDeliveryBase,
                    boxDeliveryLiter,
                    boxStorageBase,
                    boxStorageLiter,
                    dtNextBox,
                    dtTillMax,
                ]);
                console.log(`Данные для склада ${warehouseName} успешно сохранены.`);
            } catch (error) {
                console.error(`Ошибка при сохранении данных для склада ${warehouseName}:`, error);
            }
        }
    }

    async runMigrations() {
        const migrations = [
            {
                name: "create_warehouse_box_rates",
                sql: `
                CREATE TABLE IF NOT EXISTS warehouse_box_rates (
                  id SERIAL PRIMARY KEY,
                  warehouse_name VARCHAR(255) NOT NULL,
                  box_delivery_and_storage_expr VARCHAR(255),
                  box_delivery_base VARCHAR(255),
                  box_delivery_liter VARCHAR(255),
                  box_storage_base VARCHAR(255),
                  box_storage_liter VARCHAR(255),
                  dtNextBox VARCHAR(255),
                  dtTillMax VARCHAR(255),
                  created_at TIMESTAMP NOT NULL DEFAULT NOW()
                );
                `,
            },
        ];

        for (const migration of migrations) {
            try {
                await this.client.query("BEGIN");
                await this.client.query(migration.sql);
                await this.client.query("COMMIT");
                console.log(`Миграция ${migration.name} прошла успешно`);
            } catch (error) {
                await this.client.query("ROLLBACK");
                console.error(`Ошибка запуска миграции ${migration.name}`, error);
            }
        }
    }
}

module.exports = Migrator;
