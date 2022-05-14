const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion } = require("mongodb");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;

//middle tair

app.use(cors());
app.use(express.json());

//connection database

const uri = `mongodb+srv://${process.env.DB_NAME}:${process.env.DB_PASS}@cluster0.wz2cy.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
console.log(uri);
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

async function run() {
  try {
    await client.connect();
    const doctorCollection = client.db("doctors").collection("services");
    const bookingCollection = client.db("doctors").collection("bookings");
    console.log("db connected");

    //get service

    app.get("/services", async (req, res) => {
      const query = {};
      const cursor = doctorCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });

    // get availabel slot api

    app.get("/available", async (req, res) => {
      const date = req.query.date || "May 14, 2022";
      console.log(date);

      const services = await doctorCollection.find().toArray();

      //step 2 gate the booking of the day

      const query = { date: date };
      const bookings = await bookingCollection.find(query).toArray();

      //step3
      services.forEach((servic) => {
        const servicebookd = bookings.filter(
          (b) => b.treatment === servic.name
        );
        const booked = servicebookd.map((s) => s.slot);
        // servic.booked = booked;
        const available = servic.slots.filter((s) => !booked.includes(s));
        servic.slots = available;
      });

      res.send(services);
    });

    //booking api

    app.post("/booking", async (req, res) => {
      const booking = req.body;
      const querry = {
        treatment: booking.treatment,
        date: booking.date,
        patient: booking.patient,
      };
      const exists = await bookingCollection.findOne(querry);
      if (exists) {
        return res.send({
          success: false,
          error: "allready take this service",
        });
      }
      const result = await bookingCollection.insertOne(booking);
      res.send({ success: true, result });
    });
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello doctors");
});

app.listen(port, () => {
  console.log(`doctors app listening on port ${port}`);
});
