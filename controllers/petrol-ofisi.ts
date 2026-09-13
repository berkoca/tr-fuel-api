import PetrolOfisi from "../library/fuel-company/PetrolOfisi";
import { citiesHandler, fuelPricesHandler } from "./fuel-company";

const petrolOfisi = new PetrolOfisi();

export const getFuelPrices = fuelPricesHandler(petrolOfisi);
export const getCities = citiesHandler(petrolOfisi);
