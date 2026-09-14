import { gql } from '@apollo/client';

export const GET_PROPERTIES = gql`
  query GetProperties($search: String, $type: String) {
    properties(search: $search, type: $type) {
      id
      title
      description
      location
      price
      type
      verified
      image
      ownerId
    }
  }
`;

export const REGISTER = gql`
  mutation Register($name: String!, $email: String!, $password: String!) {
    register(name: $name, email: $email, password: $password) {
      token
      user { id name email role }
    }
  }
`;

export const LOGIN = gql`
  mutation Login($email: String!, $password: String!) {
    login(email: $email, password: $password) {
      token
      user { id name email role }
    }
  }
`;
