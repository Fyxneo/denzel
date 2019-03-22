const Express = require("express");
const BodyParser = require("body-parser");
const MongoClient = require("mongodb").MongoClient;
const ObjectId = require("mongodb").ObjectID;
const imdb = require('./src/imdb');
const Random = require("random-js").Random;
const random = new Random()

var graphqlHTTP = require('express-graphql');
var {
  buildgraph
} = require('graphql');

const graph = require('./graph')

const DENZEL_IMDB_ID = 'nm0000243';

const CONNECTION_URL = "mongodb+srv://Fyxneo:Password@denzel-qnpxc.gcp.mongodb.net/denzel?retryWrites=true"

const DATABASE_NAME = "DBDenzel";

const LISTENING_PORT = 9292;

var root = {
  movie: () => 'Hello !'
};

var app = Express();

app.use(BodyParser.json());
app.use(BodyParser.urlencoded({ extended: true }));

var database, collection, collectionReview;


MongoClient.connect(CONNECTION_URL, { useNewUrlParser: true }, (error, client) => {
        if(error) {
            throw error;
        }
        database = client.db(DATABASE_NAME);
        collection = database.collection("Movies");
		collectionReview = database.collection("ReviewMovies")
        console.log("Connected to `" + DATABASE_NAME + "`!");
		
	app.use('/graphql', graphqlHTTP({
    graph,
    rootValue: root,
    graphiql: true,
    context: {
		collection: collection
    }
  }));
    app.listen(LISTENING_PORT, () => {
    console.log("Listening on `" + LISTENING_PORT + "` PORT!");
  });
});


app.get("/movies/populate", async(request, response) => {
	
	const AllMovies = await imdb(DENZEL_IMDB_ID);
    
	collection.insertMany(AllMovies, (error, result) => {
        if(error) {
            return response.status(500).send(error);
        }
        response.send(result.result);
    });
		var messageToSend = { "total":result.length }
		response.send(messageToSend);
});

app.get("/movies", (request, response) => {
    collection.find({ metascore: { $gt: 70 }}).toArray((error, result) => {
        if(error) {
            return response.status(500).send(error);
        }
        var messageToSend = result[random.integer(0, result.length-1)]
        response.send(messageToSend);
    });

});

app.get("/movies/:id", (request, response) => {
    collection.findOne({ "id": request.params.id }, (error, result) => {
        if(error) {
            return response.status(500).send(error);
        }
        response.send(result);
    });
});


app.get("/movies/search", (request, response) => {
        var limit = Number(request.query.limit) || 5;
        var metascore = Number(request.query.metascore) || 70;
		var query = { metascore: { $gte: parseInt(metascore) }};
		
        if(limit || metascore){
            database.collection("movies").aggregate([
                {"$match" : {"metascore" : {"$gte" : metascore}}},
                {"$sample" : {"size" : limit}}
            ]).toArray((err, res) =>{
                if(err) return status(500).send(err);
                response.json({"limit" : limit, "metascore" : metascore, "results" : res});
            })
        }
		
    });


app.post("/movies/:id", (request, response) => {
    var date = request.body.date;
    var review = request.body.review;
    var query = { "id": request.params.id };
    collection.updateOne(query, { $set: { date: date, review: review } }, (error, result) => {
        if (error) {
            return response.status(500).send(error);
        }
        response.send(result.result);
        console.log("Added new review");
    });
});
