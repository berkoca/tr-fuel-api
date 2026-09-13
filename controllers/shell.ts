import { Request, Response } from "express";
import Shell, { UnknownCityError } from "../library/fuel-company/Shell";

function queryString(value: unknown): string | undefined {
    return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function handleError(res: Response, error: unknown) {
    const status = error instanceof UnknownCityError ? 404 : 500;
    return res.status(status).json({
        message: (error as any).message
    });
}

export async function getFuelPrices(req: Request, res: Response) {
    try {
        const shell = new Shell();
        const fuelPrices = await shell.getFuelPrices(
            queryString(req.query.city),
            queryString(req.query.county)
        );

        return res.json(fuelPrices);
    } catch (error) {
        return handleError(res, error);
    }
}

export async function getCities(req: Request, res: Response) {
    try {
        const shell = new Shell();
        const cities = await shell.getCities();

        return res.json(cities);
    } catch (error) {
        return handleError(res, error);
    }
}

export async function getCounties(req: Request, res: Response) {
    const city = queryString(req.query.city);
    if (!city) {
        return res.status(400).json({
            message: "Query parameter 'city' (city code or name) is required."
        });
    }

    try {
        const shell = new Shell();
        const counties = await shell.getCounties(city);

        return res.json(counties);
    } catch (error) {
        return handleError(res, error);
    }
}

export async function getProducts(req: Request, res: Response) {
    try {
        const shell = new Shell();
        const products = await shell.getProducts();

        return res.json(products);
    } catch (error) {
        return handleError(res, error);
    }
}
