import type { Product } from "./types";

/**
 * Ориентировочные БЖУ типовых блюд и продуктов на 100 г.
 *
 * Нужны, когда человек знает, что съел («шаурма», «борщ»), но не знает
 * пищевой ценности и ему нечего отсканировать. Значения — усреднённые
 * справочные, поэтому результат всегда помечается как приблизительный.
 */
export type TypicalFood = {
  name: string;
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
  group: string;
  /** типичная порция, г (подставляется в граммовку) */
  portion?: number;
  aliases?: string[];
  /** калории частично из спирта — проверка сходимости БЖУ к калориям не применима */
  alcohol?: boolean;
};

export const TYPICAL_FOODS: TypicalFood[] = [
  // ---------- супы ----------
  { name: "Борщ", kcal: 45, protein: 1.5, fat: 2, carbs: 5, portion: 300, group: "супы", aliases: ["борщ украинский", "борщ с мясом"] },
  { name: "Щи", kcal: 35, protein: 1.5, fat: 1.8, carbs: 3.5, portion: 300, group: "супы", aliases: ["щи из свежей капусты"] },
  { name: "Суп куриный с лапшой", kcal: 46, protein: 2.6, fat: 1.5, carbs: 5.5, portion: 300, group: "супы", aliases: ["куриный суп", "суп с лапшой"] },
  { name: "Солянка", kcal: 72, protein: 3.5, fat: 4.5, carbs: 4.5, portion: 300, group: "супы", aliases: ["солянка мясная"] },
  { name: "Гороховый суп", kcal: 68, protein: 3.5, fat: 2.5, carbs: 8, portion: 300, group: "супы" },
  { name: "Крем-суп из тыквы", kcal: 47, protein: 1.2, fat: 2.5, carbs: 5, portion: 300, group: "супы", aliases: ["тыквенный суп", "крем-суп"] },
  { name: "Окрошка", kcal: 55, protein: 3, fat: 2.5, carbs: 5, portion: 300, group: "супы" },
  { name: "Уха", kcal: 47, protein: 4, fat: 1.5, carbs: 4.5, portion: 300, group: "супы", aliases: ["рыбный суп"] },
  { name: "Харчо", kcal: 75, protein: 4, fat: 3.5, carbs: 7, portion: 300, group: "супы" },
  { name: "Рассольник", kcal: 52, protein: 2.5, fat: 2.5, carbs: 5, portion: 300, group: "супы" },
  { name: "Крем-суп грибной", kcal: 60, protein: 2, fat: 3.5, carbs: 5, portion: 300, group: "супы", aliases: ["грибной суп", "суп-пюре грибной"] },
  { name: "Бульон куриный", kcal: 15, protein: 1.5, fat: 0.5, carbs: 0.5, portion: 300, group: "супы", aliases: ["бульон"] },

  // ---------- гарниры ----------
  { name: "Гречка отварная", kcal: 110, protein: 4.2, fat: 1.1, carbs: 20.5, portion: 200, group: "гарниры", aliases: ["гречка", "гречневая каша", "гречневая крупа готовая"] },
  { name: "Рис отварной", kcal: 113, protein: 2.2, fat: 0.5, carbs: 24.5, portion: 200, group: "гарниры", aliases: ["рис", "белый рис готовый"] },
  { name: "Картофель отварной", kcal: 80, protein: 2, fat: 0.4, carbs: 16.5, portion: 200, group: "гарниры", aliases: ["картошка", "варёная картошка", "картофель"] },
  { name: "Картофель жареный", kcal: 192, protein: 2.5, fat: 9, carbs: 25, portion: 200, group: "гарниры", aliases: ["жареная картошка", "картошка по-деревенски"] },
  { name: "Картофельное пюре", kcal: 106, protein: 2.5, fat: 4, carbs: 15, portion: 200, group: "гарниры", aliases: ["пюре", "пюрешка"] },
  { name: "Макароны отварные", kcal: 130, protein: 5, fat: 1.1, carbs: 25, portion: 200, group: "гарниры", aliases: ["макароны", "паста", "спагетти готовые"] },
  { name: "Картофель фри", kcal: 312, protein: 3.4, fat: 15, carbs: 41, portion: 150, group: "гарниры", aliases: ["фри", "картошка фри"] },
  { name: "Булгур отварной", kcal: 88, protein: 3, fat: 0.2, carbs: 18.6, portion: 200, group: "гарниры" },
  { name: "Кускус отварной", kcal: 110, protein: 3.8, fat: 0.2, carbs: 23, portion: 200, group: "гарниры" },
  { name: "Овсянка на воде", kcal: 88, protein: 3, fat: 1.7, carbs: 15, portion: 250, group: "гарниры", aliases: ["овсяная каша", "овсянка", "геркулес"] },
  { name: "Каша рисовая на молоке", kcal: 130, protein: 3, fat: 4, carbs: 20, portion: 250, group: "гарниры", aliases: ["рисовая каша"] },
  { name: "Каша манная", kcal: 100, protein: 3, fat: 3, carbs: 16, portion: 250, group: "гарниры", aliases: ["манная каша", "манка"] },
  { name: "Тушёные овощи", kcal: 60, protein: 2, fat: 3, carbs: 6, portion: 200, group: "гарниры", aliases: ["овощное рагу", "рагу", "тушёные овощи с маслом"] },

  // ---------- мясо и птица ----------
  { name: "Куриная грудка отварная", kcal: 137, protein: 29.8, fat: 1.8, carbs: 0.5, portion: 150, group: "мясо и птица", aliases: ["куриная грудка", "отварная курица", "куриное филе"] },
  { name: "Куриная грудка жареная", kcal: 185, protein: 28, fat: 8, carbs: 0, portion: 150, group: "мясо и птица", aliases: ["жареная курица", "жареная грудка"] },
  { name: "Куриное бедро запечённое", kcal: 217, protein: 25, fat: 13, carbs: 0, portion: 150, group: "мясо и птица", aliases: ["куриное бедро", "бедро курицы", "курица запечённая"] },
  { name: "Куриные крылья запечённые", kcal: 250, protein: 22, fat: 17, carbs: 3, portion: 150, group: "мясо и птица", aliases: ["крылья", "куриные крылышки"] },
  { name: "Свинина жареная", kcal: 280, protein: 25, fat: 20, carbs: 0, portion: 150, group: "мясо и птица", aliases: ["жареная свинина"] },
  { name: "Свинина тушёная", kcal: 240, protein: 24, fat: 16, carbs: 1, portion: 150, group: "мясо и птица", aliases: ["тушёная свинина"] },
  { name: "Говядина тушёная", kcal: 230, protein: 26, fat: 14, carbs: 0, portion: 150, group: "мясо и птица", aliases: ["тушёная говядина", "говядина"] },
  { name: "Стейк говяжий", kcal: 250, protein: 26, fat: 16, carbs: 0, portion: 180, group: "мясо и птица", aliases: ["стейк"] },
  { name: "Котлета свино-говяжья", kcal: 264, protein: 15, fat: 20, carbs: 6, portion: 100, group: "мясо и птица", aliases: ["котлета", "котлеты", "котлета по-киевски"] },
  { name: "Куриная котлета", kcal: 190, protein: 17, fat: 10, carbs: 8, portion: 100, group: "мясо и птица", aliases: ["котлета из курицы", "куриные котлеты"] },
  { name: "Пельмени отварные", kcal: 248, protein: 11, fat: 12, carbs: 24, portion: 250, group: "мясо и птица", aliases: ["пельмени", "пельмени сибирские"] },
  { name: "Вареники с картошкой", kcal: 190, protein: 5, fat: 6, carbs: 29, portion: 250, group: "мясо и птица", aliases: ["вареники", "вареники с картофелем"] },
  { name: "Сосиски", kcal: 261, protein: 12, fat: 23, carbs: 1.5, portion: 100, group: "мясо и птица", aliases: ["сосиска", "сардельки"] },
  { name: "Колбаса варёная", kcal: 256, protein: 13, fat: 22, carbs: 1.5, portion: 50, group: "мясо и птица", aliases: ["колбаса", "докторская колбаса"] },
  { name: "Бекон жареный", kcal: 530, protein: 37, fat: 42, carbs: 1, portion: 30, group: "мясо и птица", aliases: ["бекон", "грудинка"] },
  { name: "Шашлык свиной", kcal: 320, protein: 24, fat: 24, carbs: 2, portion: 200, group: "мясо и птица", aliases: ["шашлык", "шашлык из свинины"] },
  { name: "Индейка запечённая", kcal: 150, protein: 24, fat: 5, carbs: 0, portion: 150, group: "мясо и птица", aliases: ["индейка", "индюшиное филе"] },
  { name: "Тефтели", kcal: 220, protein: 15, fat: 14, carbs: 9, portion: 150, group: "мясо и птица", aliases: ["тефтели в соусе", "фрикадельки"] },
  { name: "Голубцы", kcal: 170, protein: 8, fat: 9, carbs: 14, portion: 200, group: "мясо и птица", aliases: ["голубцы с мясом"] },
  { name: "Шницель", kcal: 258, protein: 18, fat: 18, carbs: 6, portion: 150, group: "мясо и птица", aliases: ["шницель куриный"] },
  { name: "Отбивная", kcal: 275, protein: 24, fat: 19, carbs: 3, portion: 180, group: "мясо и птица", aliases: ["отбивная котлета"] },
  { name: "Котлета паровая", kcal: 150, protein: 18, fat: 6, carbs: 5, portion: 100, group: "мясо и птица", aliases: ["паровая котлета", "котлета на пару"] },

  // ---------- рыба и морепродукты ----------
  { name: "Рыба белая запечённая", kcal: 120, protein: 21, fat: 4, carbs: 0, portion: 150, group: "рыба и морепродукты", aliases: ["запечённая рыба", "треска запечённая", "минтай"] },
  { name: "Лосось запечённый", kcal: 208, protein: 22, fat: 13, carbs: 0, portion: 150, group: "рыба и морепродукты", aliases: ["лосось", "семга", "красная рыба"] },
  { name: "Рыба жареная", kcal: 210, protein: 18, fat: 13, carbs: 5, portion: 150, group: "рыба и морепродукты", aliases: ["жареная рыба"] },
  { name: "Сельдь солёная", kcal: 217, protein: 18, fat: 16, carbs: 0, portion: 80, group: "рыба и морепродукты", aliases: ["селёдка", "сельдь"] },
  { name: "Тунец консервированный", kcal: 96, protein: 21, fat: 1, carbs: 0, portion: 100, group: "рыба и морепродукты", aliases: ["тунец", "тунец в собственном соку"] },
  { name: "Креветки отварные", kcal: 95, protein: 20.5, fat: 1.2, carbs: 0.5, portion: 100, group: "рыба и морепродукты", aliases: ["креветки"] },
  { name: "Кальмары", kcal: 100, protein: 18, fat: 2, carbs: 2, portion: 100, group: "рыба и морепродукты", aliases: ["кальмар"] },
  { name: "Рыбная котлета", kcal: 190, protein: 14, fat: 11, carbs: 8, portion: 100, group: "рыба и морепродукты", aliases: ["рыбные котлеты"] },

  // ---------- молочное и завтраки ----------
  { name: "Творог 5%", kcal: 121, protein: 17.2, fat: 5, carbs: 1.8, portion: 150, group: "молочное и завтраки", aliases: ["творог"] },
  { name: "Творог 9%", kcal: 159, protein: 16, fat: 9, carbs: 3, portion: 150, group: "молочное и завтраки", aliases: ["жирный творог"] },
  { name: "Сырники", kcal: 224, protein: 12, fat: 12, carbs: 17, portion: 150, group: "молочное и завтраки", aliases: ["сырники со сметаной"] },
  { name: "Омлет", kcal: 178, protein: 11, fat: 14, carbs: 2, portion: 150, group: "молочное и завтраки", aliases: ["омлет с молоком"] },
  { name: "Яичница-глазунья", kcal: 200, protein: 13, fat: 16, carbs: 1, portion: 120, group: "молочное и завтраки", aliases: ["яичница", "глазунья"] },
  { name: "Яйцо варёное", kcal: 155, protein: 13, fat: 11, carbs: 1, portion: 55, group: "молочное и завтраки", aliases: ["яйцо", "варёное яйцо"] },
  { name: "Йогурт натуральный", kcal: 63, protein: 5, fat: 3, carbs: 4, portion: 150, group: "молочное и завтраки", aliases: ["йогурт", "греческий йогурт"] },
  { name: "Кефир 1%", kcal: 37, protein: 3, fat: 1, carbs: 4, portion: 250, group: "молочное и завтраки", aliases: ["кефир"] },
  { name: "Ряженка 3.2%", kcal: 58, protein: 3, fat: 3.2, carbs: 4.2, portion: 250, group: "молочное и завтраки", aliases: ["ряженка"] },
  { name: "Молоко 3.2%", kcal: 60, protein: 3, fat: 3.2, carbs: 4.7, portion: 250, group: "молочное и завтраки", aliases: ["молоко"] },
  { name: "Сыр твёрдый", kcal: 357, protein: 24, fat: 29, carbs: 0, portion: 30, group: "молочное и завтраки", aliases: ["сыр", "российский сыр"] },
  { name: "Сметана 20%", kcal: 202, protein: 2.5, fat: 20, carbs: 3, portion: 30, group: "молочное и завтраки", aliases: ["сметана"] },
  { name: "Мюсли", kcal: 370, protein: 9, fat: 6, carbs: 70, portion: 60, group: "молочное и завтраки", aliases: ["мюсли с молоком"] },
  { name: "Гранола", kcal: 440, protein: 10, fat: 16, carbs: 65, portion: 50, group: "молочное и завтраки" },
  { name: "Каша овсяная на молоке", kcal: 120, protein: 4, fat: 4, carbs: 17, portion: 250, group: "молочное и завтраки", aliases: ["овсяная каша на молоке", "геркулесовая каша"] },
  { name: "Творожная запеканка", kcal: 190, protein: 14, fat: 9, carbs: 14, portion: 150, group: "молочное и завтраки", aliases: ["запеканка из творога", "запеканка"] },
  { name: "Бутерброд с колбасой", kcal: 270, protein: 10, fat: 14, carbs: 26, portion: 100, group: "молочное и завтраки", aliases: ["бутерброд"] },
  { name: "Бутерброд с сыром", kcal: 300, protein: 12, fat: 16, carbs: 28, portion: 100, group: "молочное и завтраки", aliases: ["бутерброд с маслом и сыром"] },

  // ---------- салаты ----------
  { name: "Салат овощной", kcal: 58, protein: 1.5, fat: 4, carbs: 4, portion: 150, group: "салаты", aliases: ["овощной салат", "салат из овощей"] },
  { name: "Цезарь с курицей", kcal: 232, protein: 12, fat: 16, carbs: 10, portion: 200, group: "салаты", aliases: ["цезарь", "салат цезарь"] },
  { name: "Оливье", kcal: 202, protein: 5, fat: 14, carbs: 14, portion: 150, group: "салаты", aliases: ["салат оливье"] },
  { name: "Винегрет", kcal: 128, protein: 2, fat: 8, carbs: 12, portion: 150, group: "салаты" },
  { name: "Греческий салат", kcal: 128, protein: 3.5, fat: 10, carbs: 6, portion: 150, group: "салаты", aliases: ["греческий"] },
  { name: "Морковь по-корейски", kcal: 127, protein: 1.5, fat: 9, carbs: 10, portion: 100, group: "салаты", aliases: ["корейская морковка", "морковча"] },
  { name: "Селёдка под шубой", kcal: 190, protein: 7, fat: 12, carbs: 13, portion: 150, group: "салаты", aliases: ["шуба", "сельдь под шубой"] },
  { name: "Салат с тунцом", kcal: 180, protein: 10, fat: 12, carbs: 7, portion: 200, group: "салаты" },
  { name: "Капуста с маслом", kcal: 80, protein: 1.5, fat: 5.5, carbs: 6, portion: 150, group: "салаты", aliases: ["салат из капусты", "капустный салат"] },

  // ---------- выпечка и фастфуд ----------
  { name: "Шаурма с курицей", kcal: 215, protein: 12, fat: 11, carbs: 17, portion: 250, group: "выпечка и фастфуд", aliases: ["шаурма", "шаверма"] },
  { name: "Пицца", kcal: 266, protein: 11, fat: 10, carbs: 33, portion: 150, group: "выпечка и фастфуд", aliases: ["пицца маргарита", "кусок пиццы"] },
  { name: "Гамбургер", kcal: 298, protein: 13, fat: 14, carbs: 30, portion: 200, group: "выпечка и фастфуд", aliases: ["бургер", "чизбургер"] },
  { name: "Хот-дог", kcal: 289, protein: 10, fat: 17, carbs: 24, portion: 150, group: "выпечка и фастфуд", aliases: ["хотдог"] },
  { name: "Пирожок с картошкой", kcal: 260, protein: 5, fat: 12, carbs: 33, portion: 100, group: "выпечка и фастфуд", aliases: ["пирожок", "пирожки"] },
  { name: "Беляш", kcal: 285, protein: 10, fat: 17, carbs: 23, portion: 120, group: "выпечка и фастфуд" },
  { name: "Чебурек", kcal: 315, protein: 8, fat: 19, carbs: 28, portion: 150, group: "выпечка и фастфуд" },
  { name: "Блины", kcal: 191, protein: 5, fat: 7, carbs: 27, portion: 120, group: "выпечка и фастфуд", aliases: ["блинчики", "блины со сметаной"] },
  { name: "Блины с мясом", kcal: 225, protein: 10, fat: 9, carbs: 26, portion: 200, group: "выпечка и фастфуд", aliases: ["блинчики с мясом"] },
  { name: "Оладьи", kcal: 233, protein: 6, fat: 9, carbs: 32, portion: 150, group: "выпечка и фастфуд", aliases: ["оладушки", "оладьи со сгущёнкой"] },
  { name: "Хлеб белый", kcal: 257, protein: 7.6, fat: 3.2, carbs: 50.6, portion: 30, group: "выпечка и фастфуд", aliases: ["батон", "белый хлеб"] },
  { name: "Хлеб чёрный", kcal: 210, protein: 6.8, fat: 2.5, carbs: 40, portion: 30, group: "выпечка и фастфуд", aliases: ["чёрный хлеб", "ржаной хлеб"] },
  { name: "Круассан", kcal: 414, protein: 8, fat: 22, carbs: 46, portion: 80, group: "выпечка и фастфуд" },
  { name: "Пончик", kcal: 402, protein: 5, fat: 22, carbs: 46, portion: 70, group: "выпечка и фастфуд", aliases: ["донат"] },
  { name: "Роллы", kcal: 150, protein: 6, fat: 4, carbs: 22, portion: 200, group: "выпечка и фастфуд", aliases: ["суши", "роллы с лососем"] },

  // ---------- сладкое ----------
  { name: "Шоколад молочный", kcal: 528, protein: 7.5, fat: 30, carbs: 57, portion: 30, group: "сладкое", aliases: ["шоколад", "молочный шоколад"] },
  { name: "Печенье", kcal: 446, protein: 6, fat: 18, carbs: 65, portion: 30, group: "сладкое", aliases: ["печенье сдобное"] },
  { name: "Печенье овсяное", kcal: 430, protein: 6, fat: 16, carbs: 65, portion: 30, group: "сладкое", aliases: ["овсяное печенье"] },
  { name: "Мороженое", kcal: 209, protein: 3.5, fat: 11, carbs: 24, portion: 100, group: "сладкое", aliases: ["мороженое пломбир"] },
  { name: "Торт", kcal: 348, protein: 4.5, fat: 18, carbs: 42, portion: 120, group: "сладкое", aliases: ["пирожное", "кусок торта", "торт с кремом"] },
  { name: "Вафли", kcal: 400, protein: 5, fat: 20, carbs: 50, portion: 40, group: "сладкое", aliases: ["вафли с начинкой"] },
  { name: "Сгущённое молоко", kcal: 329, protein: 7.2, fat: 8.5, carbs: 56, portion: 30, group: "сладкое", aliases: ["сгущёнка", "сгущенка"] },
  { name: "Мёд", kcal: 327, protein: 0.8, fat: 0, carbs: 81, portion: 20, group: "сладкое", aliases: ["мед"] },
  { name: "Зефир", kcal: 300, protein: 1, fat: 0.5, carbs: 75, portion: 40, group: "сладкое", aliases: ["зефир", "пастила"] },

  // ---------- фрукты и овощи ----------
  { name: "Банан", kcal: 92, protein: 1.5, fat: 0.2, carbs: 21, portion: 120, group: "фрукты и овощи" },
  { name: "Яблоко", kcal: 45, protein: 0.4, fat: 0.4, carbs: 10, portion: 180, group: "фрукты и овощи" },
  { name: "Апельсин", kcal: 37, protein: 0.9, fat: 0.2, carbs: 8.1, portion: 180, group: "фрукты и овощи", aliases: ["мандарин"] },
  { name: "Виноград", kcal: 68, protein: 0.6, fat: 0.2, carbs: 16, portion: 150, group: "фрукты и овощи" },
  { name: "Арбуз", kcal: 27, protein: 0.6, fat: 0.1, carbs: 6, portion: 300, group: "фрукты и овощи", aliases: ["дыня"] },
  { name: "Клубника", kcal: 40, protein: 0.8, fat: 0.4, carbs: 8.1, portion: 150, group: "фрукты и овощи", aliases: ["ягоды", "черника", "малина"] },
  { name: "Огурец", kcal: 15, protein: 0.8, fat: 0.1, carbs: 3, portion: 150, group: "фрукты и овощи", aliases: ["огурцы"] },
  { name: "Помидор", kcal: 20, protein: 1.1, fat: 0.2, carbs: 3.8, portion: 150, group: "фрукты и овощи", aliases: ["помидор", "томат"] },
  { name: "Авокадо", kcal: 165, protein: 2, fat: 15, carbs: 8.5, portion: 100, group: "фрукты и овощи" },

  // ---------- напитки ----------
  { name: "Кофе с молоком", kcal: 35, protein: 1.5, fat: 1.5, carbs: 4, portion: 200, group: "напитки", aliases: ["кофе", "кофе с молоком без сахара"] },
  { name: "Латте", kcal: 57, protein: 3, fat: 3, carbs: 4.5, portion: 250, group: "напитки", aliases: ["латте с молоком"] },
  { name: "Капучино", kcal: 40, protein: 2, fat: 2, carbs: 3.5, portion: 200, group: "напитки" },
  { name: "Чай без сахара", kcal: 1, protein: 0, fat: 0, carbs: 0, portion: 200, group: "напитки", aliases: ["чай"] },
  { name: "Сок апельсиновый", kcal: 44, protein: 0.7, fat: 0.2, carbs: 10, portion: 250, group: "напитки", aliases: ["сок", "яблочный сок"] },
  { name: "Кола", kcal: 42, protein: 0, fat: 0, carbs: 10.6, portion: 330, group: "напитки", aliases: ["газировка", "лимонад", "кока-кола"] },
  { name: "Смузи", kcal: 60, protein: 1, fat: 0.5, carbs: 13, portion: 250, group: "напитки", aliases: ["смузи фруктовый"] },
  { name: "Пиво светлое", kcal: 43, protein: 0.5, fat: 0, carbs: 3.6, portion: 500, group: "напитки", aliases: ["пиво"], alcohol: true },
  { name: "Вино сухое", kcal: 68, protein: 0.2, fat: 0, carbs: 2.6, portion: 150, group: "напитки", aliases: ["вино", "красное вино", "белое вино"], alcohol: true },

  // ---------- орехи и снеки ----------
  { name: "Грецкие орехи", kcal: 673, protein: 15, fat: 65, carbs: 7, portion: 30, group: "орехи и снеки", aliases: ["орехи", "грецкий орех"] },
  { name: "Миндаль", kcal: 645, protein: 21, fat: 58, carbs: 13, portion: 30, group: "орехи и снеки", aliases: ["миндальные орехи"] },
  { name: "Семечки", kcal: 580, protein: 21, fat: 51, carbs: 12, portion: 30, group: "орехи и снеки", aliases: ["семена подсолнечника"] },
  { name: "Чипсы", kcal: 530, protein: 6, fat: 34, carbs: 52, portion: 50, group: "орехи и снеки", aliases: ["чипсы картофельные"] },
  { name: "Протеиновый батончик", kcal: 350, protein: 30, fat: 10, carbs: 35, portion: 60, group: "орехи и снеки", aliases: ["протеин батончик", "батончик"] },

  // ---------- соусы и приправы ----------
  // Самый частый вопрос «что за соус я налил» — и самая разная жирность
  // у одинаковых названий, поэтому берём типовые значения для категории.
  { name: "Майонез", kcal: 620, protein: 0.5, fat: 67, carbs: 2.6, portion: 15, group: "соусы и приправы", aliases: ["майонез провансаль", "провансаль"] },
  { name: "Майонез лёгкий 25%", kcal: 250, protein: 0.5, fat: 25, carbs: 6, portion: 15, group: "соусы и приправы", aliases: ["майонез легкий"] },
  { name: "Майонезный соус 50%", kcal: 460, protein: 0.5, fat: 50, carbs: 2, portion: 15, group: "соусы и приправы", aliases: ["соус майонезный"] },
  { name: "Сырный соус", kcal: 420, protein: 1, fat: 44, carbs: 5, portion: 15, group: "соусы и приправы", aliases: ["чиз соус", "сырный соус махеев"] },
  { name: "Соус сливочно-чесночный", kcal: 300, protein: 1, fat: 30, carbs: 6, portion: 15, group: "соусы и приправы", aliases: ["чесночный соус", "сливочно чесночный"] },
  { name: "Соус тар-тар", kcal: 262, protein: 1, fat: 26, carbs: 6, portion: 15, group: "соусы и приправы", aliases: ["тартар", "тар тар"] },
  { name: "Соус цезарь", kcal: 400, protein: 1.5, fat: 42, carbs: 4, portion: 15, group: "соусы и приправы", aliases: ["цезарь соус"] },
  { name: "Сметанный соус с грибами", kcal: 218, protein: 1, fat: 22, carbs: 4, portion: 15, group: "соусы и приправы", aliases: ["грибной соус", "соус с грибами"] },
  { name: "Соус барбекю", kcal: 128, protein: 0.8, fat: 0.5, carbs: 30, portion: 15, group: "соусы и приправы", aliases: ["барбекю"] },
  { name: "Кетчуп", kcal: 95, protein: 1.3, fat: 0.2, carbs: 22, portion: 15, group: "соусы и приправы", aliases: ["кетчуп томатный"] },
  { name: "Томатный соус", kcal: 59, protein: 1.5, fat: 0.5, carbs: 12, portion: 20, group: "соусы и приправы", aliases: ["соус томатный", "итальянский соус"] },
  { name: "Соевый соус", kcal: 56, protein: 6, fat: 0, carbs: 8, portion: 10, group: "соусы и приправы", aliases: ["соевый"] },
  { name: "Горчица", kcal: 105, protein: 5, fat: 5, carbs: 10, portion: 10, group: "соусы и приправы", aliases: ["горчица столовая"] },
];

/** Слова, которые не помогают отличить одно блюдо от другого. */
const STOP_WORDS = new Set(["и", "с", "в", "на", "из", "по", "от", "или", "а", "же", "г", "мл", "шт"]);

/** «Сырни́Ки, со сметаной!» → «сырники со сметаной» */
export function normalizeName(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^a-zа-я0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(name: string): string[] {
  return normalizeName(name)
    .split(" ")
    .filter((t) => t.length >= 3 && !STOP_WORDS.has(t));
}

function tokenScore(query: string, candidate: string): number {
  if (query === candidate) return 1 + candidate.length / 10;
  if (candidate.length >= 4 && query.length >= 4) {
    if (candidate.startsWith(query) || query.startsWith(candidate)) return 0.7 + Math.min(query.length, candidate.length) / 20;
    if (candidate.includes(query) || query.includes(candidate)) return 0.5;
  }
  return 0;
}

/**
 * Вес слова по редкости: «сметаной» есть в паре десятков блюд и почти ничего
 * не говорит о блюде, а «борщ» — только в одном. Без этого «борщ со сметаной»
 * находился как «сырники со сметаной» из-за общего слова.
 */
let tokenWeights: Map<string, number> | null = null;

function weights(): Map<string, number> {
  if (tokenWeights) return tokenWeights;
  const counts = new Map<string, number>();
  for (const food of TYPICAL_FOODS) {
    const seen = new Set<string>();
    for (const variant of [food.name, ...(food.aliases ?? [])]) {
      for (const token of tokens(variant)) seen.add(token);
    }
    for (const token of seen) counts.set(token, (counts.get(token) ?? 0) + 1);
  }
  tokenWeights = new Map([...counts].map(([token, count]) => [token, 1 / (1 + Math.log(count))]));
  return tokenWeights;
}

const tokenWeight = (token: string) => weights().get(token) ?? 1;

export type Match = { food: TypicalFood; score: number };

/** Насколько название похоже на блюдо из справочника (0 — не похоже). */
export function scoreFood(name: string, food: TypicalFood): number {
  const query = normalizeName(name);
  if (!query) return 0;
  const variants = [food.name, ...(food.aliases ?? [])];
  let best = 0;
  for (const variant of variants) {
    const normalized = normalizeName(variant);
    if (normalized === query) best = Math.max(best, 5); // точное совпадение
    else if (normalized.includes(query) && query.length >= 4) best = Math.max(best, 1.6);
    const queryTokens = tokens(query);
    const candidateTokens = tokens(normalized);
    if (!queryTokens.length || !candidateTokens.length) continue;
    let sum = 0;
    let total = 0;
    for (const token of queryTokens) {
      let tokenBest = 0;
      for (const candidate of candidateTokens) tokenBest = Math.max(tokenBest, tokenScore(token, candidate));
      const weight = tokenWeight(token);
      sum += tokenBest * weight;
      total += weight;
    }
    best = Math.max(best, total ? sum / total : 0);
  }
  return best;
}

/** Выбирает самое похожее блюдо, если совпадение достаточно уверенное. */
export function matchTypical(name: string, minScore = 0.55): Match | null {
  let best: Match | null = null;
  for (const food of TYPICAL_FOODS) {
    const score = scoreFood(name, food);
    if (!best || score > best.score) best = { food, score };
  }
  return best && best.score >= minScore ? best : null;
}

export function suggestFoods(name: string, limit = 3): Match[] {
  return TYPICAL_FOODS.map((food) => ({ food, score: scoreFood(name, food) }))
    .filter((match) => match.score >= 0.5)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export type Estimate = {
  /** как продукт назвал пользователь */
  name: string;
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
  portion?: number;
  /** на что опирался расчёт — показываем пользователю */
  basis: string;
  confidence: "high" | "medium" | "low";
  source: "table" | "online";
};

/** Оценка по справочнику типовых блюд — работает без интернета. */
export function estimateFromTable(name: string): Estimate | null {
  const match = matchTypical(name);
  if (!match) return null;
  const { food, score } = match;
  const exact = normalizeName(food.name) === normalizeName(name) || (food.aliases ?? []).some((a) => normalizeName(a) === normalizeName(name));
  return {
    name: name.trim(),
    kcal: food.kcal,
    protein: food.protein,
    fat: food.fat,
    carbs: food.carbs,
    portion: food.portion,
    basis: exact ? `типовое блюдо «${food.name}» · ${food.group}` : `похоже на «${food.name}» · ${food.group}`,
    confidence: exact ? "high" : score >= 1.5 ? "medium" : "low",
    source: "table",
  };
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Среднее по найденным в Open Food Facts продуктам. Медиана, а не среднее:
 * один «выброс» (например, продукт с нулями) не должен портить оценку.
 */
export function averageProducts(products: Product[]): { kcal: number; protein: number; fat: number; carbs: number; samples: number } | null {
  const usable = products.filter((p) => p.kcal > 0);
  if (!usable.length) return null;
  const round1 = (v: number) => Math.round(v * 10) / 10;
  return {
    kcal: Math.round(median(usable.map((p) => p.kcal))),
    protein: round1(median(usable.map((p) => p.protein))),
    fat: round1(median(usable.map((p) => p.fat))),
    carbs: round1(median(usable.map((p) => p.carbs))),
    samples: usable.length,
  };
}

export function estimateFromProducts(name: string, products: Product[]): Estimate | null {
  const avg = averageProducts(products);
  if (!avg) return null;
  return {
    name: name.trim(),
    kcal: avg.kcal,
    protein: avg.protein,
    fat: avg.fat,
    carbs: avg.carbs,
    basis: `среднее по ${avg.samples} похожим продуктам Open Food Facts`,
    confidence: avg.samples >= 5 ? "medium" : "low",
    source: "online",
  };
}

/** Готовая карточка продукта из оценки — попадает в форму и в базу. */
export function estimateToDraft(estimate: Estimate): { name: string; kcal: string; protein: string; fat: string; carbs: string; portion: string } {
  const text = (v: number) => String(Math.round(v * 10) / 10);
  return {
    name: estimate.name,
    kcal: text(estimate.kcal),
    protein: text(estimate.protein),
    fat: text(estimate.fat),
    carbs: text(estimate.carbs),
    portion: estimate.portion ? String(estimate.portion) : "",
  };
}
