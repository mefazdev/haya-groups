export interface DishCategory {
  title: string;
  dishes: string[];
}

// The caterer's menu. Each category becomes a section of tick boxes in the editor.
export const DISH_CATEGORIES: DishCategory[] = [
  {
    title: "Refreshing Welcome Drinks - Live",
    dishes: [
      "Orange", "Grape", "Pineapple", "Guava", "Watermelon", "Chikku", "Anar", "Apple", "Fig Coc", "Coc Sharjah",
      "Kannur Cocktail", "Mumbai Sarbath", "Deep Blue Sea", "Spicy Orange", "Virgin Mojito",
    ],
  },
  {
    title: "Healthy Fresh Salads",
    dishes: [
      "Pineapple Honey Mint", "Arabic Salad", "Fresh Garden Salad", "Arugula Shallot with Poached Egg",
      "Avocado Shrimps Salad", "Crunchy Radish with Cherry", "Lemon Herb Mediterranean Chicken",
      "Spicy Grilled Chicken Salad", "Chilli Basil Pineapple", "Arugula Salad with Apple", "Raw Mango", "Radish Mango",
      "Cool Cucumber", "Winter Cheese Salad", "Mandarin Orange Salad",
    ],
  },
  {
    title: "Soup",
    dishes: [
      "Cream of Chicken, Mutton, Veg Soup", "Sweet Corn Chicken, Mutton, Veg Soup", "Lung Fung Chicken Soup",
      "Mutton Paya Soup", "Malabar Chicken Soup", "Veg Treo Soup", "Farm House Broth", "Manchow Soup",
      "Malabari Seafood Soup",
    ],
  },
  {
    title: "Main Course",
    dishes: [
      "Biriyani Chicken, Mutton, Kutton, Leghorn, Fish, Prawns", "Hyderabadi Chicken, Mutton Biriyani", "Seafood Majboos",
      "Turkish Rice", "Bukhari Rice", "Moroccan Rice", "Mandhi Varieties", "Kabsa Varieties", "Kashmiri Pulao",
      "Fried Rice Varieties", "Ghee Rice", "Jeera Rice", "Coconut Rice",
    ],
  },
  {
    title: "Starters",
    dishes: [
      "Fried Chicken Lollipop", "Kathaif Chicken", "Chicken Strips", "Thread Chicken", "Yummy Stick Chicken",
      "Thai Chicken", "Honey Glazed Chicken", "Yummy Prawns", "Fish Finger", "Barbeque Veg", "Crispy Fried Veg",
    ],
  },
  {
    title: "Bread",
    dishes: [
      "Small Porotta", "Nool Porotta", "Stuffed Porotta", "Appam", "Palappam", "Phulka Roti", "Battura", "Ghee Pathal",
      "Nice Pathiri", "Madakka Chappathi", "Roti", "Naan", "Butter Naan", "Kulcha", "Thenga Paal Pathiri",
      "Kannu Vecha Pathiri", "Dosa Varieties", "Puttu Varieties",
    ],
  },
  {
    title: "Gravy",
    dishes: [
      "Valluvanadan Chicken, Mutton Curry", "Alleppey Chicken, Mutton Curry", "Butter Chicken", "Mutton, Kutton Chops",
      "Chicken, Mutton, Kutton, Veg Stew", "Malabari Chicken, Mutton, Kutton Curry", "Achayan Chicken, Mutton, Kutton",
      "Fish Mulakittathu", "Fish / Prawns Mango Curry", "Mutton, Chicken, Veg Kuruma", "Pepper Chicken, Mutton",
      "Mutton Rogan Josh", "Veg Curry", "Navarathna Kuruma", "Paneer Butter Masala", "Paneer Hungama",
      "Veg Ball Manchurian",
    ],
  },
  {
    title: "Fry",
    dishes: [
      "Spring Chicken Fry", "Chicken Kethal Fry", "Chicken Alfahm Varieties", "Payyoli Chicken", "Malai Chicken",
      "Tandoori Chicken", "Tawa Chicken", "Thai Chicken", "Chicken Shawaya", "Chicken Karaikkudi", "Chicken Chukka",
      "Beef Varattiyathu", "Beef Karaikkudi", "Beef Chukka", "Beef Dragon", "Mutton Leg", "Whole Mutton",
      "Mutton Onion Fry", "Mutton Grilled Rib", "Fish Tawa", "Fish Kanthari Tawa", "Prawns Roast", "Prawns Tawa",
      "Paneer Tawa", "Thai Paneer", "Mushroom Dry Fry", "Gobi 65", "Baby Corn Dry Fry", "Crispy Fried Veg",
    ],
  },
  {
    title: "Desserts",
    dishes: [
      "Short Pudding Varieties", "Raffaello Pudding", "White Vancho", "German Forest", "Dry Fruit Souffle",
      "Fresh Fruit Tart", "Tender Coconut Souffle", "Mango Cheese Cake", "Red Velvet", "Irish Coffee", "Choco Lava",
      "Baklava Varieties", "Turkish Tulumba", "Luqaimat", "Basbousa", "Mini Falooda", "Fruit Salad with Ice Cream",
      "Shahi Tukda", "Malabari Halwa", "Rasmalai", "Ghee Vada with Rabdi", "Ghee Pak", "Hot Jilebi",
    ],
  },
  {
    title: "Beverages",
    dishes: [
      "Samovar Tea", "Irani Tea", "Pepper Tea", "Masala Tea", "Ginger Tea", "Hibiscus Tea", "Rosemary Tea", "Ananas Tea",
      "Cinnamon Tea", "Cardamom Tea", "Tea & Coffee", "Mineral Water",
    ],
  },
];
