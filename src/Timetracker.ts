import {IConfig} from "./IConfig";

import bodyParser = require("body-parser");
import * as Express from "express";
import {UnauthorizedError} from "express-jwt";
import ExpressValidator = require("express-validator");
import * as http from "http";
import * as mongoose from "mongoose";
import * as configJSON from "../config.json";
import {OnLoadController} from "./api/controllers/OnLoadController";
import {TimeEntryController} from "./api/controllers/TimeEntryController";
import {UserController} from "./api/controllers/UserController";
import {Passport} from "./Passport";
import {ValidationError} from "./ValidationError";

export class Timetracker {

    static get config(): IConfig {
        return this._config;
    }

    static set config(value: IConfig) {
        this._config = value;
    }

    // tslint:disable-next-line:variable-name
    private static _config: IConfig;
    // tslint:disable-next-line:variable-name
    private _express: Express.Express;

    constructor() {
        Timetracker._config = configJSON;

        this.bootstrap().then(() => {
            console.log("Loaded")
        }).catch(e => {
            console.log("Failed to bootstrap");
            console.log(e);
        });
    }

    private bootstrap = async (): Promise<void> => {
        try {
            await mongoose.connect(
                Timetracker.config.database,
                {useNewUrlParser: true}
            );
        } catch (e) {
            console.log(e);
            process.exit(1);
            return;
        }

        this._express = Express();

        // CORS
        this._express.disable("x-powered-by");
        this._express.use((req, res, next) => {
            res.header("Access-Control-Allow-Origin", "*");
            res.header(
                "Access-Control-Allow-Headers",
                "Origin, X-Requeted-With, Content-Type, Accept, Authorization, RBR"
            );
            if (req.headers.origin) {
                res.header("Access-Control-Allow-Origin", req.headers.origin.toString());
            }
            if (req.method === "OPTIONS") {
                res.header(
                    "Access-Control-Allow-Methods",
                    "GET, POST, PUT, PATCH, DELETE"
                );
                return res.status(200).json({});
            }
            next();
        });

        // Body Parser
        this._express.use(bodyParser.urlencoded({extended: false})); // Allow Express to handle json in bodies
        this._express.use(bodyParser.json()); //                                ^

        // Validation
        this._express.use(ExpressValidator());

        // Basic home page
        this._express.get("/", (req, res) => {
            res.set("location", "https://team2502.com");
            res.status(301).send();
        });

        // Mount our routes
        await this.mountRoutes();

        // Error handling
        this._express.use((err, req, res, next) => {
            console.log("Caught error in request chain: ", err);
            console.log("This is most likely not an issue.");
            if (err instanceof ValidationError) {
                res.status(400).json({error: true, message: err.json})
            } else if (err instanceof UnauthorizedError) {
                res.status(401).json({error: true, message: "Unauthorized"})
            } else {
                res.status(500).json({error: true, message: err.message});
            }
        });

        // Configure Passport
        Passport.bootstrap();

        await this.createHttp();
    };

    private createHttp = async (): Promise<void> => {
        const httpServer = http.createServer(this._express);

        // Listen on the HTTP/HTTPS port
        httpServer.listen(Timetracker.config.web.ports.http);
    };

    private mountRoutes = async (): Promise<void> => {
        const router = Express.Router();

        const userController = new UserController();
        userController.initRoutes(router);

        const entryController = new TimeEntryController();
        entryController.initRoutes(router);

        const onLoadController = new OnLoadController();
        onLoadController.initRoutes(router);

        this._express.use("/api/v1/", router);
    };
}
