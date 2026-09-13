import app from "./app";

const port = process.env.PORT || 3002;

app.listen(port, () => console.log(`App listening on port ${port}.`));
