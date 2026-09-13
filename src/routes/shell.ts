import { Router } from "express";
import { getCities, getCounties, getFuelPrices, getProducts } from "../controllers/shell";

const shell_router = Router();

shell_router.get("/fuel-prices-by-cities", getFuelPrices);
shell_router.get("/cities", getCities);
shell_router.get("/counties", getCounties);
shell_router.get("/products", getProducts);

export default shell_router;
