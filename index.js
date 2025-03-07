const express = require("express");
const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const cors = require("cors");
require("dotenv").config();
const port = process.env.PORT || 5000;

app.use(express.json());
app.use(cors());

const uri = `mongodb+srv://${process.env.FACEBOOKUSER}:${process.env.PASS}@cluster0.ysrfscy.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    const usersCollection = client.db("facebook").collection("users");
    const postsCollection = client.db("facebook").collection("posts");

    // add all user to the mongodb
    app.post("/users", async (req, res) => {
      const body = req.body;
      const result = await usersCollection.insertOne(body);
      res.send(result);
    });

    // get all users from the mongodb
    app.get("/users", async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });

    // upload on facebook data
    app.post("/posts", async (req, res) => {
      const body = req.body;
      const newPost = {
        ...body,
        likes: [], // Initialize likes as an empty array
        uploadedtime: new Date(), // Optional: Ensure uploaded time is consistent
      };
      const result = await postsCollection.insertOne(newPost);
      res.send(result);
    });

    // get uploaded on facebook data
    app.get("/posts", async (req, res) => {
      const result = await postsCollection.find().toArray();
      res.send(result);
    });

    // get all myposts base on email
    app.get(`/myposts`, async (req, res) => {
      const email = req.query.email;
      if (!email) {
        res.send([]);
      }
      const query = { email: email };
      const result = await postsCollection
        .find(query)
        .sort({ uploadedtime: 1 })
        .toArray();
      res.send(result);
      console.log("my post", result);
    });

    // like action implement
    app.post("/posts/like", async (req, res) => {
      const { postId, userEmail } = req.body;
      console.log(postId, userEmail);

      if (!postId || !userEmail) {
        return res
          .status(400)
          .send({ message: "postId and userEmail are required." });
      }

      if (!ObjectId.isValid(postId)) {
        return res.status(400).send({ message: "Invalid postId." });
      }

      try {
        const post = await postsCollection.findOne({
          _id: new ObjectId(postId),
        });

        if (!post) {
          return res.status(404).send({ message: "Post not found." });
        }

        const alreadyLiked = post.likes?.includes(userEmail);
        const updateAction = alreadyLiked
          ? { $pull: { likes: userEmail } } // Remove like
          : { $push: { likes: userEmail } }; // Add like

        const result = await postsCollection.updateOne(
          { _id: new ObjectId(postId) },
          updateAction
        );

        res.send({
          success: true,
          message: alreadyLiked ? "removed" : "added",
          result,
        });
      } catch (error) {
        console.error("Error liking post:", error);
        res.status(500).send({ message: "Server error", error });
      }
    });

    // Get a specific post based on email and postId
    app.delete("/myposts/:id", async (req, res) => {
      const id = req.params.id;
      const email = req.query.email;
      const query = { _id: new ObjectId(id), email };
      try {
        const result = await postsCollection.deleteOne(query);
        if (result) {
          res.status(200).send(result);
        } else {
          res.status(404).send({ message: "Post not found" });
        }
      } catch (error) {
        res.status(500).send({ message: "Server error", error });
      }
    });

    app.delete("/user/:id", async (req, res) => {
      const id = req.params.id;
      const query = {_id: new ObjectId(id)}
      const result = await usersCollection.deleteOne(query)
      res.status(200).send(result)
    })

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello facebook!");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
