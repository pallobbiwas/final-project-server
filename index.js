const express = require("express");
const cors = require("cors");
var jwt = require("jsonwebtoken");
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

//custom mideltair

function veryFiyJwt(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ message: "Unauthorized user" });
  }
  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
    if (err) {
      return res.send(403).send({ message: "forbbiden" });
    }
    req.decoded = decoded;
    next();
  });
}

async function run() {
  try {
    await client.connect();
    const doctorCollection = client.db("doctors").collection("services");
    const bookingCollection = client.db("doctors").collection("bookings");
    const userCollection = client.db("doctors").collection("users");
    console.log("db connected");

    //get service

    app.get("/services", async (req, res) => {
      const query = {};
      const cursor = doctorCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });

    //get for all user

    app.get("/alluser", veryFiyJwt, async (req, res) => {
      const user = await userCollection.find().toArray();
      res.send(user);
    });

    //api for individual user

    app.get("/booking", veryFiyJwt, async (req, res) => {
      const patientEmail = req.query.patientEmail;
      const authorization = req.headers.authorization;
      const decodedMail = req.decoded.email;
      if (patientEmail === decodedMail) {
        const query = { patientEmail: patientEmail };
        const booking = await bookingCollection.find(query).toArray();
        return res.send(booking);
      } else {
        return res.status(403).send({ message: "forbbiden" });
      }
    });

    // get availabel slot api

    app.get("/available", async (req, res) => {
      const date = req.query.date || "May 14, 2022";

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

    //update user

    app.put("/user/:email", async (req, res) => {
      const email = req.params.email;
      const filter = { email: email };
      const options = { upsert: true };
      const user = req.body;
      const updateDoc = {
        $set: user,
      };
      const result = await userCollection.updateOne(filter, updateDoc, options);

      const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN, {
        expiresIn: "1h",
      });

      res.send({ result, token });
    });

    //mak admin

    app.get('/admin/:email', async(req, res) => {
      const email = req.params.email;
      const user = await userCollection.findOne({email: email});
      const isAdmin = user.role === 'admin';
      res.send({admin: isAdmin});
    })

    app.put("/user/admin/:email", veryFiyJwt, async (req, res) => {
      const email = req.params.email;
      const adminuser = req.decoded.email;
      const adminuserAccount = await userCollection.findOne({
        email: adminuser,
      });
      if (adminuserAccount.role ==='admin') {
        const filter = { email: email };
        const updateDoc = {
          $set: { role: "admin" },
        };
        const result = await userCollection.updateOne(filter, updateDoc);

        res.send(result);
      } else {
        res.status(403).send({ message: "not valid" });
      }
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
