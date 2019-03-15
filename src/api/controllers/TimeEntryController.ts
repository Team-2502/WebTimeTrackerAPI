import {IController} from "./IController";
import {Router} from "express-serve-static-core";
import {TimeEntryModel} from "../../schemas/TimeEntry";
import {Types} from "mongoose";
import {APITokenMiddleware} from "../middleware/APITokenMiddleware";

export class TimeEntryController implements IController {
    public initRoutes = (expressRouter: Router) => {
        expressRouter.get("/entry", this.getEntries);
        expressRouter.get("/entry/:entry/remove", [APITokenMiddleware.checkForToken], this.getEntries);
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
