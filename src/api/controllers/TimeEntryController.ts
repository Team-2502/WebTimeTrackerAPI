import {Router} from "express";
import {Types} from "mongoose";
import {TimeEntryModel} from "../../schemas/TimeEntry";
import {AuthMiddleware} from "../middleware/AuthMiddleware";
import {IController} from "./IController";

export class TimeEntryController implements IController {
    public initRoutes = (expressRouter: Router) => {
        expressRouter.get("/entry", this.getEntries);
        expressRouter.get("/entry/:entry/remove", [AuthMiddleware.jwtAuth.required, AuthMiddleware.isMentor], this.getEntries);
    };

    private removeEntry = async (req, res, next) => {
        try{
            await TimeEntryModel.findByIdAndDelete(Types.ObjectId(req.params.entry)).orFail();
        }catch (e) {
            return next(e);
        }

        return res.json({});
    };

    private getEntries = async (req, res, next) => {
        try {
            return res.json({entries: await TimeEntryModel.find({})});
        } catch (e) {
            return next(e);
        }
    }

}
