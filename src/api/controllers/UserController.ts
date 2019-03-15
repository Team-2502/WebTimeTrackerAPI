import {IController} from "./IController";
import {Router} from "express";
import {APITokenMiddleware} from "../middleware/APITokenMiddleware";
import {PersonModel} from "../../schemas/Person";
import {Types} from "mongoose";
import {TimeEntryModel} from "../../schemas/TimeEntry";
import {TimeUtil} from "../../TimeUtil";
import {check, validationResult} from "express-validator/check";
import {ValidationError} from "../../ValidationError";

export class UserController implements IController {
    public initRoutes = (expressRouter: Router): void => {
        expressRouter.get("/user/", [
            APITokenMiddleware.checkForToken,
        ], this.getAll);

        expressRouter.get("/findActive", this.getActive);

        expressRouter.get("/user/:user/startTracking", [
            APITokenMiddleware.checkForToken,
        ], this.startTracking);

        expressRouter.get("/user/:user/endTracking", [
            APITokenMiddleware.checkForToken,
        ], this.endTracking);

        expressRouter.get("/user/:user", [
            APITokenMiddleware.checkForToken,
        ], this.getEntries);

        expressRouter.get("/user/:user/expired", [
            APITokenMiddleware.checkForToken,
        ], this.getExpired);

        expressRouter.post("/user/add", [
            APITokenMiddleware.checkForToken,
            check("firstName").isString(),
            check("firstName").isLength({min: 1, max: 100}),
            check("lastName").isString(),
            check("lastName").isLength({min: 1, max: 100})
        ], this.addUser);

        expressRouter.post("/user/remove", [
            APITokenMiddleware.checkForToken,
        ], this.removeUser);

        expressRouter.get("/top", this.viewTop);
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

        console.log("got entries: " + JSON.stringify(entries));

        entries.forEach(entry => {
            if (!entry.timeEnded) return;
            userTotal.set(entry._person, (userTotal.get(entry._person) || 0) + TimeUtil.dateDiffInDays(entry.timeStarted, entry.timeEnded));
        });

        let topValues = Array.from(userTotal.keys()).sort((a, b) => userTotal.get(a) - userTotal.get(b));
        if (topValues.length > 10) {
            topValues = topValues.slice(0, 10);
        }

        return res.json({topValues});
    };

    private addUser = async (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return next(new ValidationError(errors.array()));
        }

        try {
            await new PersonModel({
                firstName: req.body.firstName,
                lastName: req.body.lastName
            }).save();
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
                })
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
        }catch (e) {
            return next(e);
        }
    };

    private getAll = async (req, res, next) => {
        try {
            return res.json({users: await PersonModel.find({})})
        }catch (e) {
            return next(e);
        }
    };

    private getActive = async (req, res, next) => {
        try {

            let activeEntries = await TimeEntryModel.find({
                timeEnded: undefined,
                $or: [
                    {
                        timedOut: false
                    },
                    {
                        timedOut: undefined
                    }
                ]
            })

            const activePeople = activeEntries.map(entry => { return entry._person });
            console.log("active people: " + JSON.stringify(activePeople));
            console.log("active entries: " + JSON.stringify(activeEntries));

            return res.json({ activePeople: activePeople });
        }catch (e) {
            return next(e);
        }
    }
}
