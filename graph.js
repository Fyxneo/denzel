const ASYNC_MAX_RETRY = 5;
const { makeExecutableSchema } = require('graphql-tools');
const retry = require('async-retry');
const IMBD = require("./src/imdb");
const Random = require("random-js").Random;
const DENZEL_IMDB_ID = 'nm0000243';

const prepare = (o) => {
  o._id = o._id.toString()
  return o
}



const typeDefs = [`
  type Query {
    movies: Movie
    mustwatch: Movie
    denzel: [Movie]
    populate: Int
    movie(id: String!): Movie
  }
  type Mutation {
    AddReview(id: String!, review: String!, date: String!): Movie
  }
  type Movie {
    _id: String
    title: String
    link: String
    id: String
    metascore: Int
    poster: String
    rating: Float
    synopsis: String
    votes: Int
    year: Int
    date: String
    review: String
  }
  schema {
    query: Query
    mutation: Mutation
  }`
];

const resolvers = {
  'Query': {
    'movies': async (obj, args, context) => {

      const { collection } = context;

      return await retry(async () => {

        var result = await collection.find({}).toArray();
        return result[Random.integer(0, result.length - 1)];

      }, { 'retries': ASYNC_MAX_RETRY });
    },


    'mustwatch': async (obj, args, context) => {
      const { collection } = context;
      return await retry(async () => {

        var result = await collection.find({
          metascore: {
            $gt: 70
          }
        }).toArray();
        return result[Random.integer(0, result.length - 1)];

      }, { 'retries': ASYNC_MAX_RETRY });
    },
    'denzel':
      async (obj, args, context) => {
        const { collection } = context;
        return await retry(async () => {
          console.log("'Denzel' query:");
          var array = (await collection.find({}).toArray()).map(prepare);
          return array;
        }, { 'retries': ASYNC_MAX_RETRY });
      },
   
    'populate':
      async (obj, args, context) => {
        const { collection } = context;
        return await retry(async () => {
          var movies = await IMBD(DENZEL_IMDB_ID);
          await collection.insert(movies, (error, result) => {
            if (error) {
              throw error;
            }
            console.log("Movies added.")
          });
          return await collection.countDocuments();
        }, { 'retries': ASYNC_MAX_RETRY });
      },
    
    'movie':
      async (obj, args, context) => {
        const { collection } = context;
        return await retry(async () => {
          const myID = args.id;
          return await collection.findOne({ "id": myID });
        }, { 'retries': ASYNC_MAX_RETRY });
      }
  },
 
  'Mutation': {
    'AddReview': async (obj, args, context) => {
      const { collection } = context;
      return await retry(async () => {
        const { id, review, date } = args;

        var myquery = {
          "id": id
        };
        var newvalues = {
          $set: {
            "date": date,
            "review": review
          }
        };
        collection.updateOne(myquery, newvalues);

        return await collection.findOne({ "id": id });
      })
    }
  }
};

module.exports = makeExecutableSchema({
  typeDefs,
  resolvers
});
