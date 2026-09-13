import { Request, Response } from "express";
import Shell from "../library/fuel-company/shell";
import { citiesHandler, fuelPricesHandler, handleError, queryString } from "./fuel-company";

const shell = new Shell();

export const getFuelPrices = fuelPricesHandler(shell);
export const getCities = citiesHandler(shell);

export async function getCounties(req: Request, res: Response) {
    const city = queryString(req.query.city);
    if (!city) {
        return res.status(400).json({
            message: "Query parameter 'city' (city code or name) is required."
        });
    }

    try {
        return res.json(await shell.getCounties(city));
    } catch (error) {
        return handleError(res, error);
    }
}

export async function getProducts(req: Request, res: Response) {
    try {
        return res.json(await shell.getProducts());
    } catch (error) {
        return handleError(res, error);
    }
}
