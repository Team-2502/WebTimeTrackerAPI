import {IConfig} from "./IConfig";

import bodyParser = require("body-parser");
import * as Express from "express";
import ExpressValidator = require("express-validator");
import * as fs from "fs-extra";
import * as http from "http";
import * as https from "https";
import * as mongoose from "mongoose";
import * as passport from "passport";
import passportLocal = require("passport-local");
import * as configJSON from "../config.json";
import {OnLoadController} from "./api/controllers/OnLoadController";
import {TimeEntryController} from "./api/controllers/TimeEntryController";
import {UserController} from "./api/controllers/UserController";
import {PersonModel} from "./schemas/Person";
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
            console.log("boi done")
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

        // Configure Passport
        this.configurePassport();

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
            console.log(err);
            if (err instanceof ValidationError) {
                res.json({error: true, message: err.json})
            } else {
                res.json({error: true, message: err.message});
            }
        });

        await this.createHttp();
    };

    private createHttp = async (): Promise<void> => {
        let httpServer;
        let httpsServer;
        if (process.env.NODE_ENV === "dev") {
            // Create dev server
            httpServer = http.createServer(this._express);
        } else {
            // Create redirect prod server
            httpServer = http.createServer((req, res) => {
                res.writeHead(301, {
                    Location:
                        "https://" +
                        Timetracker.config.web.host +
                        ":" +
                        Timetracker.config.web.ports.https +
                        req.url
                });
                res.end();
            });

            const creds = {
                key: await fs.readFile(Timetracker.config.ssl.key),
                cert: await fs.readFile(Timetracker.config.ssl.cert)
            };

            httpsServer = https.createServer(creds, this._express);
        }

        // Listen on the HTTP/HTTPS port
        httpServer.listen(Timetracker.config.web.ports.http);
        if (httpsServer) {
            httpsServer.listen(Timetracker.config.web.ports.https);
        }
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

    private configurePassport = (): void => {
        passport.use(new passportLocal.Strategy({
            usernameField: "email",
            passwordField: "password"
        }, async (username, password, done) => {
            try {
                const user = await PersonModel.findOne({email: username}).orFail();
                if (await user.comparePassword(password)) { return done(null, user); }
                else { return done(null, false, { message: "Invalid username/password" }); }
            } catch (e) {
                return done(null, false, {message: e});
            }
        }))
    }
}
