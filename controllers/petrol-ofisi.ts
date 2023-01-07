import { Request, Response } from "express";
import PetrolOfisi from "../library/fuel-company/PetrolOfisi";

export async function getFuelPrices(req: Request, res: Response) {
    try {
        const petrolOfisi = new PetrolOfisi();
        const fuelPrices = await petrolOfisi.getFuelPrices();

        return res.json(fuelPrices);
    } catch (error) {
        return res.status(500).json({
            message: (error as any).message
        });
    }
}

export async function getCities(req: Request, res: Response) {
    try {
        const petrolOfisi = new PetrolOfisi();
        const cities = await petrolOfisi.getCities();
    
        return res.json(cities);
    } catch (error) {
        return res.status(500).json({
            message: (error as any).message
        });
    }
}