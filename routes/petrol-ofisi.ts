import { Router } from "express";
import { getCities, getFuelPrices } from "../controllers/petrol-ofisi";

const petrol_ofisi_router = Router();

petrol_ofisi_router.get("/fuel-prices-by-cities", getFuelPrices);
petrol_ofisi_router.get("/cities", getCities);

export default petrol_ofisi_router;
