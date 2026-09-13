import PetrolOfisi from "../library/fuel-company/petrol-ofisi";
import { citiesHandler, fuelPricesHandler } from "./fuel-company";

const petrolOfisi = new PetrolOfisi();

export const getFuelPrices = fuelPricesHandler(petrolOfisi);
export const getCities = citiesHandler(petrolOfisi);
