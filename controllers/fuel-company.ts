import { Request, Response } from "express";
import { FuelCompany, UnknownCityError } from "../library/base/FuelCompany";

export function queryString(value: unknown): string | undefined {
    return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export function handleError(res: Response, error: unknown) {
    const status = error instanceof UnknownCityError ? 404 : 500;
    return res.status(status).json({
        message: (error as any).message
    });
}

/** Shared handlers so every brand exposes the same endpoints with the same shape. */
export function fuelPricesHandler(company: FuelCompany) {
    return async (req: Request, res: Response) => {
        try {
            const fuelPrices = await company.getFuelPrices({
                city: queryString(req.query.city),
                county: queryString(req.query.county),
            });
            return res.json(fuelPrices);
        } catch (error) {
            return handleError(res, error);
        }
    };
}

export function citiesHandler(company: FuelCompany) {
    return async (req: Request, res: Response) => {
        try {
            return res.json(await company.getCities());
        } catch (error) {
            return handleError(res, error);
        }
    };
}
