import {ExportToCsv} from "export-to-csv";
import {Router} from "express";
import {check} from "express-validator/check";
import {Types} from "mongoose";
import PersonSchema from "../../schemas/Person";
import {TimeEntryModel} from "../../schemas/TimeEntry";
import {TimeUtil} from "../../TimeUtil";
import {AuthMiddleware} from "../middleware/AuthMiddleware";
import {IController} from "./IController";

export class TimeEntryController implements IController {
    public initRoutes = (expressRouter: Router) => {
        expressRouter.get("/entry", this.getEntries);
        expressRouter.get("/entry/download", this.exportAsCSV);
        expressRouter.get("/entry/:entry/remove", [AuthMiddleware.jwtAuth.required, AuthMiddleware.isMentor], this.removeEntry);
        expressRouter.post('/entry/add', [
            AuthMiddleware.jwtAuth.required,
            AuthMiddleware.isMentor,
            check("person").isMongoId(),
            check("timeStarted").toDate(),
            check("timeEnded").toDate()
        ], this.addEntry)
    };

    private addEntry = async (req, res, next) => {

    };

    private exportAsCSV = async (req, res, next) => {
        try{
            const entries = await TimeEntryModel.find({});

            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename=\"' + 'entry-export-' + Date.now() + '.csv\"');

            const csvExporter = new ExportToCsv({
                useKeysAsHeaders: true,
                title: "Time Tracker Entry Log Export",
                showTitle: true,
            });

            const queryExport = [];
            entries.forEach(entry => {
                if(!entry.timeEnded ||!entry.timeStarted || entry.timedOut) {
                    return;
                }

                queryExport.push({
                    "Time Started": entry.timeStarted,
                    "Time Ended": entry.timeEnded,
                    "Total Minutes": TimeUtil.dateDiff(entry.timeStarted, entry.timeEnded),
                    "Person": (entry._person as PersonSchema).firstName + " " + (entry._person as PersonSchema).lastName
                });
            });

            res.end(csvExporter.generateCsv(queryExport, true));
        } catch (e) {
            return next(e);
        }
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
            return res.json({
                entries: await TimeEntryModel.find({})
            });
        } catch (e) {
            return next(e);
        }
    }

}
