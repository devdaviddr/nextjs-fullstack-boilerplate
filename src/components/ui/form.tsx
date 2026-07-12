'use client'

import * as React from 'react'
import {
  Controller,
  ControllerProps,
  FieldPath,
  FieldValues,
  FormProvider,
  useFormContext,
} from 'react-hook-form'
import { cn } from '@/lib/utils'
import { Label } from '@/components/ui/label'

const Form = FormProvider

type FormFieldContextValue<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> = {
  name: TName
}

const FormFieldContext = React.createContext<FormFieldContextValue>(
  {} as FormFieldContextValue,
)

const FormField = <
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
  ...props
}: ControllerProps<TFieldValues, TName>) => {
  return (
    <FormFieldContext.Provider value={{ name: props.name }}>
      <Controller {...props} />
    </FormFieldContext.Provider>
  )
}

const FormItemContext = React.createContext<{ id: string }>(
  {} as { id: string },
)

const FormItem = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const id = React.useId()
  return (
    <FormItemContext.Provider value={{ id }}>
      <div ref={ref} className={cn('space-y-2', className)} {...props} />
    </FormItemContext.Provider>
  )
})
FormItem.displayName = 'FormItem'

const FormLabel = React.forwardRef<
  HTMLLabelElement,
  React.LabelHTMLAttributes<HTMLLabelElement>
>(({ className, ...props }, ref) => {
  const { id } = React.useContext(FormItemContext)
  return (
    <Label htmlFor={id} className={cn('', className)} ref={ref} {...props} />
  )
})
FormLabel.displayName = 'FormLabel'

const FormControl = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<'div'>
>(({ ...props }, ref) => {
  const { id } = React.useContext(FormItemContext)
  return <div ref={ref} id={id} {...props} />
})
FormControl.displayName = 'FormControl'

const FormDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => {
  const { id } = React.useContext(FormItemContext)
  return (
    <p
      id={`${id}-description`}
      ref={ref}
      className={cn('text-muted-foreground text-sm', className)}
      {...props}
    />
  )
})
FormDescription.displayName = 'FormDescription'

const FormMessage = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, children, ...props }, ref) => {
  const { id } = React.useContext(FormItemContext)
  const formContext = useFormContext()
  const fieldName = React.useContext(FormFieldContext)?.name
  const fieldState = formContext.getFieldState(
    fieldName as string,
    formContext.formState,
  )
  const error =
    fieldState?.invalid && fieldState.error
      ? (fieldState.error.message ?? '')
      : ''

  if (!error && !children) return null

  return (
    <p
      id={`${id}-message`}
      ref={ref}
      className={cn('text-destructive text-sm font-medium', className)}
      {...props}
    >
      {error || children}
    </p>
  )
})
FormMessage.displayName = 'FormMessage'

export {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
  FormFieldContext,
}
