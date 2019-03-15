import {Router} from "express";

export abstract class IController {
    public initRoutes = (expressRouter: Router): void => {
    };
}
