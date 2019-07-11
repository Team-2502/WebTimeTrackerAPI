import {ExportToCsv} from "export-to-csv";
import {Router} from "express";
import {check, validationResult} from "express-validator/check";
import {Types} from "mongoose";
import * as passport from "passport";
import {PersonModel} from "../../schemas/Person";
import {TimeEntryModel} from "../../schemas/TimeEntry";
import {TimeUtil} from "../../TimeUtil";
import {ValidationError} from "../../ValidationError";
import {AuthMiddleware} from "../middleware/AuthMiddleware";
import {IController} from "./IController";

export class UserController implements IController {
    public initRoutes = (expressRouter: Router): void => {
        expressRouter.get("/user/", this.getAll);

        expressRouter.get("/findActive", this.getActive);
        expressRouter.get("/user/:user/startTracking", [
            AuthMiddleware.jwtAuth.required,
            AuthMiddleware.isMentor
        ], this.startTracking);

        expressRouter.get("/user/:user/endTracking", [
            AuthMiddleware.jwtAuth.required,
            AuthMiddleware.isMentor
        ], this.endTracking);

        expressRouter.get("/user/changePassword", AuthMiddleware.jwtAuth.required, this.changePassword);

        expressRouter.get("/user/login", this.login);

        expressRouter.get("/user/download", this.exportAllAsCsv);

        expressRouter.get("/user/:user", this.getEntries);

        expressRouter.get("/user/:user/expired", [
            AuthMiddleware.jwtAuth.required,
            AuthMiddleware.isMentor
        ], this.getExpired);

        expressRouter.post("/user/add", [
            check("firstName").isString(),
            check("firstName").isLength({min: 1, max: 100}),
            check("lastName").isString(),
            check("lastName").isLength({min: 1, max: 100}),
            check("email").isEmail(),
            check("email").isLength({min: 1, max: 100}),
            check("password").isString(),
            check("password").isLength({min: 5, max: 100}),
            check("role").custom(value => {
                if (value !== "student" && value !== "mentor") { throw new Error("Role must be a student or mentor"); }
                return true; // This isn't in the docs but you need to return true.
            })
        ], this.addUser);

        expressRouter.post("/user/login", [
            check("email").isEmail(),
            check("email").isLength({min: 1, max: 100}),
            check("password").isString(),
            check("password").isLength({min: 5, max: 100}),
        ], this.login);

        expressRouter.post("/user/changePassword", [
            check("oldPassword").isString(),
            check("oldPassword").isLength({min: 5, max: 100}),
            check("newPassword").isString(),
            check("newPassword").isLength({min: 5, max: 100}),
        ], this.changePassword);

        expressRouter.get("/user/:user/remove", [
            AuthMiddleware.jwtAuth.required,
            AuthMiddleware.isMentor
        ], this.removeUser);

        expressRouter.get("/top", this.viewTop);
        expressRouter.get("/viewInactive", this.getNonactive);
    };

    private exportAllAsCsv = async (req, res, next) => {
        try{
            const userTotal = new Map();

            let entries;
            try {
                entries = await TimeEntryModel.find({});
            } catch (e) {
                return next(e);
            }

            entries.forEach(entry => {
                if (!entry.timeEnded) { return; }
                const person = JSON.stringify(entry._person);
                userTotal.set(person, (userTotal.get(person) || 0) + TimeUtil.dateDiff(entry.timeStarted, entry.timeEnded));
            });

            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename=\"' + 'user-export-' + Date.now() + '.csv\"');

            const csvExporter = new ExportToCsv({
                useKeysAsHeaders: true,
                title: "Time Tracker User Export",
                showTitle: true,
            });

            const queryExport = [];
            Array.from(userTotal.keys()).forEach(user => {
                const jsonUser = JSON.parse(user);
                queryExport.push({
                    "Total Minutes": userTotal.get(user),
                    "Person": jsonUser.firstName + " " + jsonUser.lastName
                });
            });

            res.end(csvExporter.generateCsv(queryExport, true));
        } catch (e) {
            return next(e);
        }
    };

    private changePassword = async (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return next(new ValidationError(errors.array()));
        }

        try {
            const user = await PersonModel.findById(req.payload.id).orFail();
            if (! (await user.comparePassword(req.body.oldPassword))) { return next(new Error("Password does not match.")) }
            await user.setPassword(req.body.newPassword);
            await user.save();
        } catch (e) {
            return next(e);
        }

    };

    private login = async (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return next(new ValidationError(errors.array()));
        }

        try{
            const user: any = await new Promise((resolve, reject) => {
                passport.authenticate("local", {
                    session: false
                }, (err, passportUser) => {
                    if (err) { return reject(err); }
                    else if (passportUser) { return resolve(passportUser); }
                    else { return reject(new Error("Failed to authenticate.")); }
                })(req,res,next);
            });

            if(!user){ return next(new Error("Failed to authenticate.")); }

            return res.json({
                user: user.getAuthJson()
            })
        }catch (e) {
            return next(e);
        }

    };

    private getNonactive = async (req, res, next) => {
        let entries;
        let people;
        try {
            const getActiveEntries = TimeEntryModel.find({
                timeEnded: undefined,
                $or: [
                    {
                        timedOut: false
                    },
                    {
                        timedOut: undefined
                    }
                ]
            });

            const getPeople = PersonModel.find({});

            people = await getPeople;
            entries = await getActiveEntries;
        } catch (e) {
            return next(e);
        }

        entries.forEach(entry =>
            people = people.filter(person =>
                person._id.toString() !== entry._person._id.toString()));

        return res.json({
            inactivePeople: people
        });
    };

    private startTracking = async (req, res, next) => {
        try {
            const user = await PersonModel.findById(Types.ObjectId(req.params.user)).orFail();
            await user.signIn();
        } catch (e) {
            return next(e);
        }

        return res.json({});
    };

    private endTracking = async (req, res, next) => {
        try {
            const user = await PersonModel.findById(Types.ObjectId(req.params.user)).orFail();
            await user.signOut();
        } catch (e) {
            return next(e);
        }

        return res.json({});
    };

    private viewTop = async (req, res, next) => {
        const userTotal = new Map();

        let entries;
        try {
            entries = await TimeEntryModel.find({});
        } catch (e) {
            return next(e);
        }

        entries.forEach(entry => {
            if (!entry.timeEnded) { return; }
            const person = JSON.stringify(entry._person);
            userTotal.set(person, (userTotal.get(person) || 0) + TimeUtil.dateDiff(entry.timeStarted, entry.timeEnded));
        });

        let topUsers = Array.from(userTotal.keys()).sort((a, b) => userTotal.get(a) - userTotal.get(b)).reverse();
        if (topUsers.length > 10) {
            topUsers = topUsers.slice(0, 2);
        }

        const topTimes = topUsers.map(topValue => {
            return {
                user: JSON.parse(topValue),
                time: userTotal.get(topValue)
            }
        });

        return res.json({topUsers: topTimes});
    };

    private addUser = async (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return next(new ValidationError(errors.array()));
        }

        try {
            const newUser =  new PersonModel({
                firstName: req.body.firstName,
                lastName: req.body.lastName,
                email: req.body.email,
                role: req.body.role
            });

            await newUser.setPassword(req.body.password);
            await newUser.save();
        } catch (e) {
            return next(e);
        }

        return res.json({});
    };

    private getEntries = async (req, res, next) => {
        try {
            return res.json({
                entries: await TimeEntryModel.find({
                    _person: Types.ObjectId(req.params.user),
                    $or: [
                        {
                            timedOut: false
                        },
                        {
                            timedOut: undefined
                        }
                    ]
                }),
                user: await PersonModel.findById(Types.ObjectId(req.params.user)).orFail()
            });
        } catch (e) {
            return next(e);
        }
    };

    private getExpired = async (req, res, next) => {
        try {
            return res.json({
                entries: await TimeEntryModel.find({
                    _person: Types.ObjectId(req.params.user),
                    timedOut: true
                })
            });
        } catch (e) {
            return next(e);
        }
    };

    private removeUser = async (req, res, next) => {
        try {
            const user = PersonModel.findById(Types.ObjectId(req.params.user)).orFail();
            await user.remove();
        } catch (e) {
            return next(e);
        }

        return res.json({});
    };

    private getAll = async (req, res, next) => {
        try {
            return res.json({users: await PersonModel.find({})})
        } catch (e) {
            return next(e);
        }
    };

    private getActive = async (req, res, next) => {
        let activeEntries;
        try {
            activeEntries = await TimeEntryModel.find({
                timeEnded: undefined,
                $or: [
                    {
                        timedOut: false
                    },
                    {
                        timedOut: undefined
                    }
                ]
            });
        } catch (e) {
            return next(e);
        }
        return res.json({
            activePeople: activeEntries.map(entry => {
                return {
                    user: entry._person,
                    timeStarted: entry.timeStarted
                }
            })
        });

    }
}
