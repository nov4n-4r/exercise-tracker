import express from "express"
import cors from "cors"
import { MongoClient, ObjectId } from "mongodb"
import bodyParser from "body-parser"

/* >>> Global variable <<< */
const PORT = 80
const MONGODB_SERVER = "<url-to-db>"
/* >>> Global variable <<< */

/* >>> Instances <<< */
const app = express()
const client = new MongoClient(MONGODB_SERVER)
client.connect()
  .then(() => console.log(`Connected to Mongodb server at ${MONGODB_SERVER}`))
  .catch((error) => {
    console.log(`Unable to connect Mongodb server at ${MONGODB_SERVER}`)
    console.log(error)
  })
const db = client.db("exercise-tracker")
const userCollection = db.collection("user")
const logCollection = db.collection("log")
/* >>> Instances <<< */

/* >>> Middleware <<< */
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())
app.use(cors())

/* >>> Routing <<< */
app.get("/", (req, res) => {
  res.send("Hello world")
})

app.get("/api/users", async (req, res) => {
  try {
    const users = await userCollection.find({}).toArray()
    return res.json(users)
  } catch (error) {
    return res.sendStatus(500)
  }
})

app.post("/api/users", async (req, res) => {
  try {

    const username = req.body.username
    const isExist = await userCollection.findOne({ username: username })
    if (Boolean(isExist)) return res.json(isExist)

    const { insertedId } = await userCollection.insertOne({ username })
    const inserted = await userCollection.findOne({ _id: ObjectId(insertedId) })
    return res.json(inserted)

  } catch (error) {
    console.log(error)
    return res.sendStatus(500)
  }
})

app.post("/api/users/:_id/exercises", async (req, res) => {
  try {
    // console.log({
    //   params : req.params,
    //   body : req.body
    // })
    // if (req.body[":_id"] !== req.params["_id"]) return res.sendStatus(400)
    const { description, duration } = req.body
    const date = (req.body.date) ? new Date(req.body.date) : new Date()
    if (date.toString() === "Invalid Date") return res.sendStatus(400)
    const _id = req.params._id

    const user = await userCollection.findOne({ _id: ObjectId(_id) })
      .catch(err => { throw err })
    if (!Boolean(user)) return res.sendStatus(404)

    const input = await logCollection.insertOne({
      description, duration,
      userId: _id,
      dateString: date.toDateString(),
      dateTime: date.getTime(),
    }).catch(err => { throw err })

    const log = await logCollection.findOne({ _id: ObjectId(input.insertedId) })
      .catch(err => { throw err })

    return res.json({
      username: user.username,
      description: log.description,
      duration: parseInt(log.duration),
      date: log.dateString,
      _id: log.userId
    })

  } catch (error) {
    console.log(error)
    return res.sendStatus(500)
  }
})

app.get("/api/users/:_id/logs", async (req, res) => {
  console.log({
    params : req.params,
    query : req.query
  })
  try {
    const userId = req.params["_id"]
    const query = { userId }
    const limit = req.query.limit ? parseInt(req.query.limit) : 100
    if (
      req.query.from || req.query.to
    ) {
      query.dateTime = {}
      if (req.query.from) query.dateTime.$gt = (new Date(req.query.from)).getTime() - 1000 * 60 * 60 * 24
      if (req.query.to) query.dateTime.$lte = (new Date(req.query.to)).getTime()
    }
    const user = await userCollection.findOne({ _id: ObjectId(userId) })
      .catch(error => { throw error })
    const logs = await logCollection.find(query).limit(limit).toArray()
      .then(data => data.map(log => ({
        description: log.description,
        duration: parseInt(log.duration),
        date: log.dateString
      }))
      )
      .catch(error => { throw error })
    if (
      !Boolean(user) ||
      !Boolean(logs)
    ) return res.sendStatus(404)

    return res.json({
      username: user.username,
      count: logs.length,
      _id: user._id,
      log: logs
    })
  } catch (error) {
    console.log(error)
    return res.sendStatus(500)
  }
})

app.listen(PORT, () => console.log(`App listening at port : ${PORT}`))
