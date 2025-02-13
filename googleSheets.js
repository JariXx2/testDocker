const {google} = require("googleapis");

class GoogleSheetsService {
    constructor(credentialsPath) {
        this.credentialsPath = credentialsPath;
    }

    async init() {
        this.auth = new google.auth.GoogleAuth({
            keyFile: this.credentialsPath,
            scopes: ["https://www.googleapis.com/auth/spreadsheets"],
        });

        this.client = await this.auth.getClient();
        this.sheets = google.sheets({version: "v4", auth: this.client});
    }

    async exportData(spreadsheetId, data, sheetName = "stocks_coefs") {
        if (!this.sheets) {
            await this.init();
        }

        const values = [
            [
                "warehouse_name",
                "box_delivery_and_storage_expr",
                "box_delivery_base",
                "box_delivery_liter",
                "box_storage_base",
                "box_storage_liter",
                "dtNextBox",
                "dtTillMax",
            ],
            ...data.map((item) => [
                item.warehouse_name,
                item.box_delivery_and_storage_expr,
                item.box_delivery_base,
                item.box_delivery_liter,
                item.box_storage_base,
                item.box_storage_liter,
                item.dtnextbox || "",
                item.dttillmax || "",
            ]),
        ];

        const resource = {
            values,
        };

        try {
            const sheetExists = await this.checkIfSheetExists(spreadsheetId, sheetName);
            if (!sheetExists) {
                await this.createSheet(spreadsheetId, sheetName);
            }

            await this.clearSheet(spreadsheetId, sheetName);

            await this.sheets.spreadsheets.values.append({
                spreadsheetId,
                range: `${sheetName}!A1`,
                valueInputOption: "RAW",
                resource,
            });
            console.log("Данные успешно выгружены в Google Sheets");
        } catch (error) {
            console.error("Ошибка при выгрузке данных в Google Sheets:", error);
        }
    }

    async checkIfSheetExists(spreadsheetId, sheetName) {
        const response = await this.sheets.spreadsheets.get({
            spreadsheetId,
        });
        const sheets = response.data.sheets;
        return sheets.some((sheet) => sheet.properties.title === sheetName);
    }

    async createSheet(spreadsheetId, sheetName) {
        const requestBody = {
            requests: [
                {
                    addSheet: {
                        properties: {
                            title: sheetName,
                        },
                    },
                },
            ],
        };

        await this.sheets.spreadsheets.batchUpdate({
            spreadsheetId,
            resource: requestBody,
        });

        console.log(`Лист "${sheetName}" успешно создан.`);
    }

    async clearSheet(spreadsheetId, sheetName) {

        await this.sheets.spreadsheets.values.clear({
            spreadsheetId,
            range: `${sheetName}!A1:ZZ`,
        });

        console.log(`Лист "${sheetName}" успешно очищен.`);
    }

    sortDataByCoefficient(data, coefficientKey) {
        return data.sort((a, b) => parseFloat(a[coefficientKey]) - parseFloat(b[coefficientKey]));
    }
}

module.exports = GoogleSheetsService;
