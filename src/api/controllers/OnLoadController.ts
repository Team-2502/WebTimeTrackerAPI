import {IController} from "./IController";
import {Router} from "express";
import {APITokenMiddleware} from "../middleware/APITokenMiddleware";

export class OnLoadController implements IController{
    public initRoutes = (expressRouter: Router) => {
        expressRouter.get("/onLoad", this.onLoad);
    };

    private onLoad = async (req, res, next) => {
        return res.json({
            isAuthorized: APITokenMiddleware.checkReq(req)
        })
    };
}
