import { useEffect, useState } from 'react';
import PubSub from 'pubsub-js';
import AnimatedNumber from 'animated-number-react';
import PanelTemplate from '../panel_template/PanelTemplate';
import weightIcon from '../../../../../assets/images/gui/hud/weight-icon.png';
import infoIcon from '../../../../../assets/images/gui/panels/crafting/info-icon.png';
import craftButtonBorderValid from '../../../../../assets/images/gui/panels/crafting/craft-button-border-valid.png';
import craftButtonBorderInvalid from '../../../../../assets/images/gui/panels/crafting/craft-button-border-invalid.png';
import ItemIconsList from '../../../../../shared/ItemIconsList';
import styles from './CraftingPanel.module.scss';
import panelTemplateStyles from '../panel_template/PanelTemplate.module.scss';
import { ApplicationState, GUIState, InventoryState } from '../../../../../shared/state';
import ItemTooltip from '../../item_tooltip/ItemTooltip';
import {
    ADD_INVENTORY_ITEM, MODIFY_INVENTORY_WEIGHT, MODIFY_INVENTORY_ITEM, REMOVE_INVENTORY_ITEM,
} from '../../../../../shared/EventTypes';
import Global from '../../../../../shared/Global';
import getTextDef from '../../../../../shared/GetTextDef';
import { formatItemValue } from '@rogueworld/utils';
import Config from '../../../../../shared/Config';
import { CraftingRecipe, CraftingRecipeIngredient } from '../../../../../shared/types';
import EntityIconsList from '../../../../../game/EntityIconsList';

const findAmountInInventory = (ingredient: CraftingRecipeIngredient) => {
    const found = InventoryState.items.find(
        (item) => item.typeCode === ingredient.itemTypeCode,
    );

    if (found) {
        return found.quantity;
    }

    return 0;
};

const checkPlayerHasEveryIngredient = (recipe: CraftingRecipe) => (
    recipe.ingredients.every((ingredient) => (
        findAmountInInventory(ingredient)) >= ingredient.quantity)
);

function IngredientRow({ ingredient }: { ingredient: CraftingRecipeIngredient }) {
    const [amountInInventory, setAmountInInventory] = useState(findAmountInInventory(ingredient));

    useEffect(() => {
        const subs = [
            PubSub.subscribe(ADD_INVENTORY_ITEM, () => {
                setAmountInInventory(findAmountInInventory(ingredient));
            }),
            PubSub.subscribe(REMOVE_INVENTORY_ITEM, () => {
                setAmountInInventory(findAmountInInventory(ingredient));
            }),
            PubSub.subscribe(MODIFY_INVENTORY_ITEM, () => {
                setAmountInInventory(findAmountInInventory(ingredient));
            }),
        ];

        return () => {
            subs.forEach((sub) => {
                PubSub.unsubscribe(sub);
            });
        };
    }, []);

    return (
        <div className={styles.row}>
            <img
                src={ItemIconsList[
                    Config.ItemTypes[ingredient.itemTypeCode].iconSource
                ]}
                className={styles.icon}
                draggable={false}
                onMouseEnter={() => {
                    GUIState.setTooltipContent(
                        <ItemTooltip
                            itemTypeCode={ingredient.itemTypeCode}
                        />,
                    );
                }}
                onMouseLeave={() => {
                    GUIState.setTooltipContent(null);
                }}
            />
            <span className={`${styles['text']} high-contrast-text`}>{ingredient.quantity}</span>
            <span className={styles.space} />
            <span className={`${styles.text} high-contrast-text ${amountInInventory < ingredient.quantity ? styles.invalid : ''}`}>
                {`(${amountInInventory})`}
            </span>
        </div>
    );
}

function RecipeSlot({
    recipe,
    selected,
    onClick,
}: {
    recipe: CraftingRecipe;
    selected: boolean;
    onClick: (recipe: CraftingRecipe) => void;
}) {
    const [canBeCrafted, setCanBeCrafted] = useState(checkPlayerHasEveryIngredient(recipe));

    useEffect(() => {
        const subs = [
            PubSub.subscribe(ADD_INVENTORY_ITEM, () => {
                setCanBeCrafted(checkPlayerHasEveryIngredient(recipe));
            }),
            PubSub.subscribe(REMOVE_INVENTORY_ITEM, () => {
                setCanBeCrafted(checkPlayerHasEveryIngredient(recipe));
            }),
            PubSub.subscribe(MODIFY_INVENTORY_ITEM, () => {
                setCanBeCrafted(checkPlayerHasEveryIngredient(recipe));
            }),
        ];

        return () => {
            subs.forEach((sub) => {
                PubSub.unsubscribe(sub);
            });
        };
    }, []);

    return (
        <div className={styles['item-slot']}>
            <div
                className={`${styles.details} ${canBeCrafted ? '' : styles.invalid} ${selected ? styles.selected : ''}`}
                draggable={false}
                onMouseEnter={() => {
                    GUIState.setTooltipContent(
                        <ItemTooltip itemTypeCode={recipe.result.itemTypeCode} />,
                    );
                    if (canBeCrafted) {
                        Global.gameScene.soundManager.effects.playGUITick();
                    }
                }}
                onMouseLeave={() => {
                    GUIState.setTooltipContent(null);
                }}
                onClick={() => { onClick(recipe); }}
            >
                <img
                    src={ItemIconsList[Config.ItemTypes[recipe.result.itemTypeCode].iconSource]}
                    draggable={false}
                />
                <div
                    className={`high-contrast-text ${(recipe.result.baseQuantity > 999) ? styles.small : ''}`}
                >
                    {formatItemValue(recipe.result.baseQuantity) || '???'}
                </div>
            </div>
        </div>
    );
}

function CraftingPanel({ onCloseCallback }: {onCloseCallback: () => void}) {
    const [items, setItems] = useState(InventoryState.items);
    const [recipes] = useState(Config.CraftingRecipes.filter((recipe) => {
        // Get all of the recipes that are valid at this kind of crafting station.
        if (recipe.stationClasses.some(
            (stationClass) => stationClass === GUIState.craftingStation?.className,
        )) {
            return recipe.result;
        }
        return false;
    }));
    const [searchRecipes, setSearchRecipes] = useState<Array<CraftingRecipe>>([]);
    const [searchText, setSearchText] = useState('');
    const [inventoryWeight, setInventoryWeight] = useState(InventoryState.weight);
    const [inventoryMaxWeight] = useState(InventoryState.maxWeight);
    const [selectedRecipe, setSelectedRecipe] = useState<CraftingRecipe | null>(null);
    const [playerHasIngredients, setPlayerHasIngredients] = useState(false);
    const [showItemDetails, setShowItemDetails] = useState(true);

    const onRecipePressed = (recipe: CraftingRecipe) => {
        setSelectedRecipe(recipe);
    };

    const onCraftPressed = () => {
        if (!selectedRecipe) return;
        if (!playerHasIngredients) return;

        ApplicationState.connection?.sendEvent('craft_item', selectedRecipe.index);
    };

    useEffect(() => {
        if (selectedRecipe) {
            setPlayerHasIngredients(checkPlayerHasEveryIngredient(selectedRecipe));
        }
        else {
            setPlayerHasIngredients(false);
        }

        setShowItemDetails(false);
    }, [selectedRecipe, items]);

    useEffect(() => {
        const filteredRecipes = recipes.filter((recipe) =>
            getTextDef(`Item name: ${Config.ItemTypes[recipe.result.itemTypeCode].translationId}`)
                .toLowerCase()
                .includes(searchText));

        setSearchRecipes(filteredRecipes);

        setSelectedRecipe(null);

        // Also hide the tooltip, as onMouseLeave doesn't get fired when an element is removed, so
        // if the cursor is over one of the slots and showing the tooltip when someone searches, if
        // the slot gets filtered out the tooltip for it will remain visible.
        GUIState.setTooltipContent(null);
    }, [searchText, recipes]);

    useEffect(() => {
        const subs = [
            PubSub.subscribe(MODIFY_INVENTORY_WEIGHT, (msg, data) => {
                setInventoryWeight(data.new);
            }),
            PubSub.subscribe(ADD_INVENTORY_ITEM, () => {
                setItems([...InventoryState.items]);
            }),
            PubSub.subscribe(REMOVE_INVENTORY_ITEM, () => {
                setItems([...InventoryState.items]);
            }),
            PubSub.subscribe(MODIFY_INVENTORY_ITEM, () => {
                setItems([...InventoryState.items]);
            }),
        ];

        return () => {
            subs.forEach((sub) => {
                PubSub.unsubscribe(sub);
            });
        };
    }, []);

    return (
        <div className={`${styles['crafting-panel']} ${panelTemplateStyles.centered} ${panelTemplateStyles['panel-template-cont']}`}>
            <PanelTemplate
                width="70vw"
                height="60vh"
                panelName={GUIState.craftingStation?.name}
                icon={EntityIconsList[GUIState.craftingStation?.icon]}
                onCloseCallback={onCloseCallback}
            >
                <div className={styles['inner-cont']}>
                    <div className={styles['list-cont']}>
                        <div className={styles['top-bar']}>
                            <div
                                className={styles['weight']}
                                onMouseEnter={() => {
                                    GUIState.setTooltipContent(getTextDef('Inventory weight'));
                                }}
                                onMouseLeave={() => {
                                    GUIState.setTooltipContent(null);
                                }}
                            >
                                <img
                                    src={weightIcon.src}
                                    width="32px"
                                    height="32px"
                                    draggable={false}
                                />
                                <span className="high-contrast-text">
                                    <AnimatedNumber
                                        value={inventoryWeight}
                                        duration={Config.NUMBER_ANIMATION_DURATION}
                                        formatValue={Config.ANIMATED_NUMBER_FORMAT}
                                    />
                                    /
                                    <AnimatedNumber
                                        value={inventoryMaxWeight}
                                        duration={Config.NUMBER_ANIMATION_DURATION}
                                        formatValue={Config.ANIMATED_NUMBER_FORMAT}
                                    />
                                </span>
                            </div>
                            <div className={styles['search']}>
                                <input
                                    placeholder={getTextDef('Item search')}
                                    onChange={(event) => {
                                        setSearchText(event.target.value.toLowerCase());
                                    }}
                                    autoFocus
                                />
                            </div>
                        </div>
                        <div className={styles['list']}>
                            {searchText && searchRecipes.map((recipe) => (
                                <RecipeSlot
                                    key={recipe.id}
                                    recipe={recipe}
                                    selected={selectedRecipe === recipe}
                                    onClick={onRecipePressed}
                                />
                            ))}
                            {searchText && !searchRecipes.length && <div className={styles['warning']}>{getTextDef('No items found')}</div>}
                            {!searchText && recipes.map((recipe) => (
                                <RecipeSlot
                                    key={recipe.id}
                                    recipe={recipe}
                                    selected={selectedRecipe === recipe}
                                    onClick={onRecipePressed}
                                />
                            ))}
                            {!searchText && !recipes.length && <div className={styles['warning']}>{getTextDef('No crafting options')}</div>}
                        </div>
                    </div>
                    <div className={`${styles['selection-cont']} ${selectedRecipe ? '' : styles.unselected}`}>
                        <div className={`${styles.name} high-contrast-text`}>
                            {
                                selectedRecipe
                                    ? getTextDef(`Item name: ${Config.ItemTypes[selectedRecipe.result.itemTypeCode].translationId}`)
                                    : ''
                            }
                        </div>
                        <div className={styles['icon-cont']}>
                            {selectedRecipe && (
                                <>
                                    <img
                                        src={ItemIconsList[
                                            Config.ItemTypes[
                                                selectedRecipe.result.itemTypeCode
                                            ].iconSource
                                        ]}
                                        className={styles.icon}
                                        draggable={false}
                                    />
                                    <div className={`${styles.amount} high-contrast-text`}>
                                        {selectedRecipe.result.baseQuantity}
                                    </div>
                                    <img
                                        src={infoIcon.src}
                                        className={styles.info}
                                        draggable={false}
                                        onClick={() => { setShowItemDetails(true); }}
                                        onMouseEnter={() => {
                                            GUIState.setTooltipContent(getTextDef('Show item details'));
                                        }}
                                        onMouseLeave={() => {
                                            GUIState.setTooltipContent(null);
                                        }}
                                    />
                                </>
                            )}
                        </div>
                        <div className={styles['ingredients-list']}>
                            {selectedRecipe
                            && selectedRecipe.ingredients.map((ingredient) => (
                                <IngredientRow
                                    key={ingredient.id}
                                    ingredient={ingredient}
                                />
                            ))}
                        </div>
                        <div
                            className={`${styles['button-cont']} ${(selectedRecipe && playerHasIngredients) ? styles.valid : ''}`}
                            onClick={onCraftPressed}
                            onMouseEnter={() => {
                                if (selectedRecipe && playerHasIngredients) {
                                    Global.gameScene.soundManager.effects.playGUITick();
                                }
                            }}
                        >
                            <img
                                src={
                                    (selectedRecipe && playerHasIngredients)
                                        ? craftButtonBorderValid.src
                                        : craftButtonBorderInvalid.src
                                }
                                draggable={false}
                            />
                            <div>{(selectedRecipe && playerHasIngredients) ? getTextDef('Craft') : ''}</div>
                        </div>
                        {selectedRecipe && showItemDetails && (
                            <div
                                className={styles.details}
                                onMouseLeave={() => { setShowItemDetails(false); }}
                            >
                                <div className={styles.name}>
                                    {getTextDef(`Item name: ${Config.ItemTypes[selectedRecipe.result.itemTypeCode].translationId}`)}
                                </div>
                                <div className={styles.description}>
                                    {getTextDef(`Item description: ${Config.ItemTypes[selectedRecipe.result.itemTypeCode].translationId}`)}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </PanelTemplate>
        </div>
    );
}

export default CraftingPanel;
