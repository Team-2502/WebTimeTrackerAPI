import {IController} from "./IController";
import {Router} from "express-serve-static-core";
import {TimeEntryModel} from "../../schemas/TimeEntry";

export class TimeEntryController implements IController {
    public initRoutes = (expressRouter: Router) => {
        expressRouter.get("/entries", this.getEntries);
    };

    private getEntries = async (req, res, next) => {
        try {
            return res.json({entries: await TimeEntryModel.find({})});
        } catch (e) {
            return next(e);
        }
    }

}
