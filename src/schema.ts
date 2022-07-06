import { makeExecutableSchema } from "@graphql-tools/schema";
import type { Link } from "@prisma/client";
import type { GraphQLContext } from "./context";
import { GraphQLYogaError } from "@graphql-yoga/node";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime";
const typeDefs = /* GraphQL */ `
  type Query {
    info: String!
    feed: [Link!]!
    comment(id: ID!): Comment
  }
  type Link {
    id: ID!
    description: String!
    url: String!
    comments: [Comment!]
  }
  type Comment {
    id: ID!
    text: String!
  }

  type Mutation {
    postLink(url: String!, description: String!): Link!
    postComment(linkId: ID!, text: String!): Comment!
  }
`;

const resolvers = {
  Query: {
    info: () => "This is the API of a Hackernews Clone",
    feed: async (root: unknown, args: {}, context: GraphQLContext) => {
      return context.prisma.link.findMany();
    },
    comment: async (
      root: unknown,
      args: { id: string },
      context: GraphQLContext
    ) => {
      return context.prisma.comment.findUnique({
        where: {
          id: Number(args.id),
        },
      });
    },
  },
  Link: {
    id: (parent: Link) => parent.id,
    description: (parent: Link) => parent.description,
    url: (parent: Link) => parent.url,
    comments: (parent: Link, args: {}, context: GraphQLContext) => {
      return context.prisma.comment.findMany({
        where: {
          linkId: parent.id,
        },
      });
    },
  },
  Mutation: {
    postLink: async (
      parent: unknown,
      args: { description: string; url: string },
      context: GraphQLContext
    ) => {
      const newLink = await context.prisma.link.create({
        data: {
          description: args.description,
          url: args.url,
        },
      });

      return newLink;
    },
    postComment: async (
      parent: unknown,
      args: { linkId: string; text: string },
      context: GraphQLContext
    ) => {
      try {
        const newComment = await context.prisma.comment.create({
          data: {
            text: args.text,
            linkId: Number(args.linkId),
          },
        });

        return newComment;
      } catch (error: unknown) {
        if (
          error instanceof PrismaClientKnownRequestError &&
          error.code === "P2003"
        ) {
          throw new GraphQLYogaError(
            `Cannot post comment on non-existing link with id '${args.linkId}'.`
          );
        }
        throw error;
      }
    },
  },
};

export const schema = makeExecutableSchema({
  typeDefs: [typeDefs],
  resolvers: [resolvers],
});
