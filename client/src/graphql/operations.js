import { gql } from '@apollo/client';

const PROPERTY_FIELDS = gql`
  fragment PropertyFields on Property {
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
`;

export const GET_PROPERTIES = gql`
  ${PROPERTY_FIELDS}
  query GetProperties($search: String, $type: String) {
    properties(search: $search, type: $type) { ...PropertyFields }
  }
`;

export const GET_PROPERTY = gql`
  ${PROPERTY_FIELDS}
  query GetProperty($id: ID!) {
    property(id: $id) { ...PropertyFields }
  }
`;

export const GET_FAVORITES = gql`
  ${PROPERTY_FIELDS}
  query GetFavorites {
    myFavorites { ...PropertyFields }
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

export const CREATE_PROPERTY = gql`
  ${PROPERTY_FIELDS}
  mutation CreateProperty($title: String!, $description: String!, $location: String!, $price: Int!, $type: String!, $image: String) {
    createProperty(title: $title, description: $description, location: $location, price: $price, type: $type, image: $image) {
      ...PropertyFields
    }
  }
`;

export const TOGGLE_FAVORITE = gql`
  mutation ToggleFavorite($propertyId: ID!) {
    toggleFavorite(propertyId: $propertyId)
  }
`;

export const REQUEST_BOOKING = gql`
  mutation RequestBooking($propertyId: ID!, $message: String) {
    requestBooking(propertyId: $propertyId, message: $message) {
      id
      status
      message
    }
  }
`;
